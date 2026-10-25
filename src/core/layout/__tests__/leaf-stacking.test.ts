import { describe, expect, it } from 'vitest';
import { autoLayout } from '../auto-layout';
import { elkEngine } from '../elk-engine';
import { computeLayoutMetrics } from '../layout-metrics';
import { prepareLayoutNodes } from '../layout-inputs';
import { computeEdgeRoutingPlacements } from '../../edge-routing';
import { getBaseHandleSide } from '../../graph/ports';
import type { LayoutDirection } from '../../framework-types';
import type { DiagramEdge, DiagramNode } from '../../types';

function node(id: string): DiagramNode {
  return { id, type: 'entity', position: { x: 0, y: 0 }, data: { label: id, tags: [], junctionType: 'or' } };
}

/** Org chart: reports point at their manager, laid out bottom-to-top. */
function orgChart(managers: number, reportsEach: number) {
  const ids = ['ceo'];
  const edges: DiagramEdge[] = [];
  for (let m = 0; m < managers; m++) {
    ids.push(`m${m}`);
    edges.push({ id: `m${m}-ceo`, source: `m${m}`, target: 'ceo' });
    for (let r = 0; r < reportsEach; r++) {
      ids.push(`m${m}r${r}`);
      edges.push({ id: `m${m}r${r}-m${m}`, source: `m${m}r${r}`, target: `m${m}` });
    }
  }
  return { nodes: ids.map(node), edges };
}

async function layout(nodes: DiagramNode[], edges: DiagramEdge[], direction: LayoutDirection = 'BT') {
  const updates = await autoLayout(nodes, edges, { direction }, elkEngine);
  const positions = new Map(updates.map((u) => [u.id, u.position]));
  const inputs = prepareLayoutNodes(nodes, edges);
  const sizes = new Map(inputs.map((n) => [n.id, n]));
  const placed = nodes.map((n) => ({ ...n, position: positions.get(n.id)! }));
  return { positions, inputs, sizes, placed };
}

function bounds(positions: Map<string, { x: number; y: number }>, sizes: Map<string, { width: number; height: number }>) {
  const xs = [...positions].flatMap(([id, p]) => [p.x, p.x + sizes.get(id)!.width]);
  const ys = [...positions].flatMap(([id, p]) => [p.y, p.y + sizes.get(id)!.height]);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

describe('leaf stacking for wide trees', () => {
  it('hangs a manager\'s reports in two columns either side of the manager\'s center', async () => {
    const { nodes, edges } = orgChart(6, 7);
    const { positions, sizes } = await layout(nodes, edges);

    for (let m = 0; m < 6; m++) {
      const manager = positions.get(`m${m}`)!;
      const spine = manager.x + sizes.get(`m${m}`)!.width / 2;
      const reports = Array.from({ length: 7 }, (_, r) => `m${m}r${r}`);
      const left = reports.filter((id) => positions.get(id)!.x + sizes.get(id)!.width <= spine);
      const right = reports.filter((id) => positions.get(id)!.x >= spine);
      expect(left.length + right.length).toBe(7);
      expect(left.length).toBeGreaterThan(0);
      expect(right.length).toBeGreaterThan(0);
      for (const id of reports) expect(positions.get(id)!.y).toBeGreaterThan(manager.y);
    }
  });

  it('keeps a wide org chart within a readable aspect ratio', async () => {
    const { nodes, edges } = orgChart(6, 7);
    const { positions, sizes } = await layout(nodes, edges);
    const { width, height } = bounds(positions, sizes);

    // Side by side, 42 reports would be about 8,400px wide and 4 levels tall.
    expect(width / height).toBeLessThan(4);
  });

  it('routes every connector without passing through a card or overlapping cards', async () => {
    const { nodes, edges } = orgChart(6, 7);
    const { positions, inputs } = await layout(nodes, edges);
    const metrics = computeLayoutMetrics(inputs, edges, positions, { layoutDirection: 'BT' });

    expect(metrics.nodeOverlaps).toBe(0);
    expect(metrics.edgeNodeOverlaps).toBe(0);
  });

  it('connects stacked reports from the side facing the manager\'s center line', async () => {
    const { nodes, edges } = orgChart(2, 8);
    const { positions, sizes } = await layout(nodes, edges);
    const boxes = new Map([...positions].map(([id, p]) => {
      const s = sizes.get(id)!;
      return [id, { left: p.x, top: p.y, right: p.x + s.width, bottom: p.y + s.height }];
    }));
    const placements = computeEdgeRoutingPlacements({ edges, nodeBoxes: boxes, layoutDirection: 'BT' });

    // Lower rows can't reach the manager from the top without crossing the
    // cards above them, so they must use the inner side.
    const lowerRows = edges.filter((e) => /r[2-7]$/.test(e.source));
    for (const e of lowerRows) {
      const manager = positions.get(e.target)!;
      const spine = manager.x + sizes.get(e.target)!.width / 2;
      const isLeftColumn = positions.get(e.source)!.x < spine;
      expect(getBaseHandleSide(placements.get(e.id)!.sourceSide)).toBe(isLeftColumn ? 'right' : 'left');
    }
  });

  it('stacks top-down trees too, growing away from the parent', async () => {
    const ids = ['root', ...Array.from({ length: 5 }, (_, i) => `b${i}`)];
    const edges: DiagramEdge[] = [];
    for (let b = 0; b < 5; b++) {
      edges.push({ id: `root-b${b}`, source: 'root', target: `b${b}` });
      for (let l = 0; l < 6; l++) {
        ids.push(`b${b}l${l}`);
        edges.push({ id: `b${b}-b${b}l${l}`, source: `b${b}`, target: `b${b}l${l}` });
      }
    }
    const { positions, sizes } = await layout(ids.map(node), edges, 'TB');
    const { width, height } = bounds(positions, sizes);

    expect(width / height).toBeLessThan(4);
    for (let b = 0; b < 5; b++) {
      for (let l = 0; l < 6; l++) expect(positions.get(`b${b}l${l}`)!.y).toBeGreaterThan(positions.get(`b${b}`)!.y);
    }
  });

  it('leaves a small tree that already fits side by side', async () => {
    const ids = ['root', 'a', 'b', 'c', 'd'];
    const edges = ['a', 'b', 'c', 'd'].map((id) => ({ id: `${id}-root`, source: id, target: 'root' }));
    const { positions } = await layout(ids.map(node), edges);
    const ys = new Set(['a', 'b', 'c', 'd'].map((id) => positions.get(id)!.y));

    expect(ys.size).toBe(1);
  });

  it('does not stack a parent whose children have children of their own', async () => {
    // The root's children are managers, not leaves, so they stay in one row.
    const { nodes, edges } = orgChart(6, 7);
    const { positions } = await layout(nodes, edges);
    const ys = new Set(Array.from({ length: 6 }, (_, m) => positions.get(`m${m}`)!.y));

    expect(ys.size).toBe(1);
  });

  it('leaves left-to-right trees side by side', async () => {
    const { nodes, edges } = orgChart(6, 7);
    const { positions } = await layout(nodes, edges, 'LR');
    const xs = new Set(Array.from({ length: 7 }, (_, r) => positions.get(`m0r${r}`)!.x));

    expect(xs.size).toBe(1);
  });

  it('gives the same layout when run again on its own result', async () => {
    const { nodes, edges } = orgChart(6, 7);
    const first = await layout(nodes, edges);
    const second = await layout(first.placed, edges);

    for (const [id, p] of first.positions) {
      expect(second.positions.get(id)!.x).toBeCloseTo(p.x, 0);
      expect(second.positions.get(id)!.y).toBeCloseTo(p.y, 0);
    }
  });
});
