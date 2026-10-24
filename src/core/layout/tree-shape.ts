export type TreeShape = 'out-tree' | 'in-tree';

/**
 * Whether the graph is a forest that a dedicated tree layout can handle.
 *
 * - 'out-tree': every node has at most one incoming edge (parent -> children).
 * - 'in-tree': every node has at most one outgoing edge (causes -> effect).
 *
 * Either way there must be no cycle even when edge direction is ignored, so
 * cross-links (a node with two parents) and loops return null.
 */
export function classifyTreeShape(
  nodeIds: readonly string[],
  edges: readonly { source: string; target: string }[],
): TreeShape | null {
  if (edges.length === 0 || !isUndirectedForest(nodeIds, edges)) return null;

  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  for (const { source, target } of edges) {
    outdegree.set(source, (outdegree.get(source) ?? 0) + 1);
    indegree.set(target, (indegree.get(target) ?? 0) + 1);
  }
  if ([...indegree.values()].every((d) => d <= 1)) return 'out-tree';
  if ([...outdegree.values()].every((d) => d <= 1)) return 'in-tree';
  return null;
}

function isUndirectedForest(
  nodeIds: readonly string[],
  edges: readonly { source: string; target: string }[],
): boolean {
  const parent = new Map(nodeIds.map((id) => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const { source, target } of edges) {
    if (!parent.has(source) || !parent.has(target)) return false;
    const a = find(source);
    const b = find(target);
    if (a === b) return false;
    parent.set(a, b);
  }
  return true;
}

/** Depth of every node in an out-tree; roots and isolated nodes are 0. */
export function computeOutTreeDepths(
  nodeIds: readonly string[],
  edges: readonly { source: string; target: string }[],
): Map<string, number> {
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const { source, target } of edges) {
    children.set(source, [...(children.get(source) ?? []), target]);
    hasParent.add(target);
  }
  const depths = new Map<string, number>();
  const queue = nodeIds.filter((id) => !hasParent.has(id));
  for (const id of queue) depths.set(id, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of children.get(id) ?? []) {
      if (depths.has(child)) continue;
      depths.set(child, depths.get(id)! + 1);
      queue.push(child);
    }
  }
  return depths;
}
