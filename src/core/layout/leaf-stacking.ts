import type { LayoutEdgeInput, LayoutEngine, LayoutInput, LayoutResult } from './layout-engine';
import { DEFAULT_ELK_EXPERIMENT_SETTINGS } from './elk-options';
import { classifyTreeShape, type TreeShape } from './tree-shape';

/** Fewer leaves than this read fine side by side. */
const MIN_STACK_SIZE = 4;
/**
 * Gap between the two columns; the parent's connector runs down its middle.
 * Handles sit 5px outside a card and step edges turn 20px out from a handle,
 * so 2 * (5 + 20) makes both columns' connectors meet on one shared line.
 */
const COLUMN_GAP = 50;
const ROW_GAP = 16;
/** Narrower trees fit a laptop screen at a readable zoom, so leave them alone. */
const MIN_STACKING_WIDTH = 1600;

interface Stack {
  parent: string;
  rows: string[][];
  columnWidth: number;
  rowHeights: number[];
  pseudo: LayoutInput;
}

/**
 * Wide trees get very wide when every leaf sits side by side. When a tree is
 * wider than a screen and than the target aspect ratio, a parent whose children are all leaves
 * gets them in two columns hanging either side of its center line, like an
 * org chart. The edge router then reaches each leaf from the inner side,
 * because a top connector would run through the cards above it.
 */
export function withStackedLeaves(base: LayoutEngine): LayoutEngine {
  return async (nodes, edges, options) => {
    const plain = await base(nodes, edges, options);
    const vertical = options.direction === 'TB' || options.direction === 'BT';
    const shape = classifyTreeShape(nodes.map((n) => n.id), edges);
    const target = options.elk?.aspectRatio ?? DEFAULT_ELK_EXPERIMENT_SETTINGS.aspectRatio;
    if (!vertical || !shape || !isTooWide(plain, nodes, target)) return plain;

    const stacks = planStacks(nodes, edges, shape);
    if (stacks.length === 0) return plain;

    const stacked = new Set(stacks.flatMap((s) => s.rows.flat()));
    const reducedNodes = [
      ...nodes.filter((n) => !stacked.has(n.id)),
      ...stacks.map((s) => s.pseudo),
    ];
    const reducedEdges = [
      ...edges.filter((e) => !stacked.has(e.source) && !stacked.has(e.target)),
      ...stacks.map((s) => (shape === 'out-tree'
        ? { source: s.parent, target: s.pseudo.id }
        : { source: s.pseudo.id, target: s.parent })),
    ];
    const laid = await base(reducedNodes, reducedEdges, options);
    return expandStacks(laid, stacks, nodes);
  };
}

function planStacks(nodes: LayoutInput[], edges: LayoutEdgeInput[], shape: TreeShape): Stack[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const [parent, child] = shape === 'out-tree' ? [edge.source, edge.target] : [edge.target, edge.source];
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }

  const stacks: Stack[] = [];
  for (const [parent, kids] of children) {
    if (kids.length < MIN_STACK_SIZE || kids.some((kid) => children.has(kid))) continue;
    const rows = Array.from({ length: Math.ceil(kids.length / 2) }, (_, r) => kids.slice(r * 2, r * 2 + 2));
    const columnWidth = Math.max(...kids.map((kid) => byId.get(kid)!.width));
    const rowHeights = rows.map((row) => Math.max(...row.map((kid) => byId.get(kid)!.height)));
    const height = rowHeights.reduce((sum, h) => sum + h, 0) + ROW_GAP * (rows.length - 1);
    stacks.push({
      parent,
      rows,
      columnWidth,
      rowHeights,
      pseudo: { id: `__stack:${parent}`, width: 2 * columnWidth + COLUMN_GAP, height },
    });
  }
  return stacks;
}

/** Replace each placeholder with its leaves, anchored on the parent's center line. */
function expandStacks(laid: LayoutResult[], stacks: Stack[], nodes: LayoutInput[]): LayoutResult[] {
  const positions = new Map(laid.map((r) => [r.id, r]));
  const widths = new Map(nodes.map((n) => [n.id, n.width]));
  const pseudoIds = new Set(stacks.map((s) => s.pseudo.id));
  const results = laid.filter((r) => !pseudoIds.has(r.id));

  for (const stack of stacks) {
    const box = positions.get(stack.pseudo.id);
    const parent = positions.get(stack.parent);
    if (!box || !parent) continue;
    const spine = parent.x + widths.get(stack.parent)! / 2;
    // The stack grows away from the parent: down when the parent is above it.
    const growsDown = box.y > parent.y;
    let y = growsDown ? box.y : box.y + stack.pseudo.height;
    stack.rows.forEach((row, r) => {
      const rowHeight = stack.rowHeights[r];
      if (!growsDown) y -= rowHeight;
      row.forEach((id, column) => {
        const x = column === 0 ? spine - COLUMN_GAP / 2 - stack.columnWidth : spine + COLUMN_GAP / 2;
        results.push({ id, x, y });
      });
      y = growsDown ? y + rowHeight + ROW_GAP : y - ROW_GAP;
    });
  }
  return results;
}

function isTooWide(results: LayoutResult[], nodes: LayoutInput[], targetAspectRatio: number): boolean {
  const sizes = new Map(nodes.map((n) => [n.id, n]));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of results) {
    const size = sizes.get(r.id);
    if (!size) continue;
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + size.width);
    maxY = Math.max(maxY, r.y + size.height);
  }
  const width = maxX - minX;
  return width > MIN_STACKING_WIDTH && width > targetAspectRatio * (maxY - minY);
}
