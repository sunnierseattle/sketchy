import type { Edge, Node } from '@xyflow/react';

/** True when every field the builder set on `next` is identical on `prev`. */
function isUnchanged<T extends object>(prev: T, next: T): boolean {
  return (Object.keys(next) as (keyof T)[]).every((key) => prev[key] === next[key]);
}

export function mergeRFNodesWithLocalState(
  prevLocalNodes: Node[],
  rfNodes: Node[],
): Node[] {
  const prevById = new Map(prevLocalNodes.map((node) => [node.id, node]));

  return rfNodes.map((node) => {
    const prevNode = prevById.get(node.id);
    // Keep the previous object when nothing it was built from changed, so
    // React Flow can skip re-rendering that node.
    if (prevNode && isUnchanged(prevNode, node)) return prevNode;
    const shouldPreserveMeasuredSize = !node.type?.toString().startsWith('annotation-');

    return {
      ...node,
      selected: prevNode?.selected ?? false,
      ...(shouldPreserveMeasuredSize && prevNode?.measured ? { measured: prevNode.measured } : {}),
      ...(shouldPreserveMeasuredSize && prevNode?.width != null ? { width: prevNode.width } : {}),
      ...(shouldPreserveMeasuredSize && prevNode?.height != null ? { height: prevNode.height } : {}),
    };
  });
}

export function mergeRFEdgesWithLocalState(
  prevLocalEdges: Edge[],
  rfEdges: Edge[],
): Edge[] {
  const prevById = new Map(prevLocalEdges.map((edge) => [edge.id, edge]));

  return rfEdges.map((edge) => {
    const prevEdge = prevById.get(edge.id);
    if (prevEdge && isUnchanged(prevEdge, edge)) return prevEdge;
    return { ...edge, selected: prevEdge?.selected ?? false };
  });
}
