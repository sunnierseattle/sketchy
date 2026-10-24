import { useMemo } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRFNodeEdgeBuilder } from '../useRFNodeEdgeBuilder';
import { useDiagramStore } from '../../store/diagram-store';
import { resetDiagramAndUIStores } from '../../test/store-fixtures';
import { computeNodeDegrees } from '../../core/graph/derived';

function renderBuilder() {
  return renderHook(() => {
    const edges = useDiagramStore((s) => s.diagram.edges);
    // Memoized on edges, as useCanvasHighlighting does in the app.
    const degreesMap = useMemo(() => computeNodeDegrees(edges), [edges]);
    return useRFNodeEdgeBuilder(null, null, degreesMap, []);
  });
}

describe('useRFNodeEdgeBuilder', () => {
  beforeEach(() => resetDiagramAndUIStores());

  it('reuses node objects for nodes that did not change, so dragging one node does not re-render the rest', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const b = store.addNode({ x: 200, y: 0 });
    const c = store.addNode({ x: 400, y: 0 });
    store.addEdge(a, b);

    const { result } = renderBuilder();
    const before = new Map(result.current.rfNodes.map((n) => [n.id, n]));

    act(() => useDiagramStore.getState().dragNodes([{ id: c, position: { x: 450, y: 30 } }]));

    const after = new Map(result.current.rfNodes.map((n) => [n.id, n]));
    expect(after.get(a)).toBe(before.get(a));
    expect(after.get(b)).toBe(before.get(b));
    expect(after.get(c)).not.toBe(before.get(c));
    expect(after.get(c)!.position).toEqual({ x: 450, y: 30 });
  });

  it('rebuilds a node when its own data changes', () => {
    const a = useDiagramStore.getState().addNode({ x: 0, y: 0 });
    const { result } = renderBuilder();
    const before = result.current.rfNodes.find((n) => n.id === a);

    act(() => useDiagramStore.getState().updateNodeText(a, 'renamed'));

    const after = result.current.rfNodes.find((n) => n.id === a)!;
    expect(after).not.toBe(before);
    expect((after.data as { label: string }).label).toBe('renamed');
  });

  it('rebuilds nodes whose degree changes when an edge is added', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const b = store.addNode({ x: 200, y: 0 });
    const { result } = renderBuilder();
    const before = result.current.rfNodes.find((n) => n.id === b);

    act(() => useDiagramStore.getState().addEdge(a, b));

    expect(result.current.rfNodes.find((n) => n.id === b)).not.toBe(before);
  });

  it('reuses edge objects that do not touch the dragged node', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const b = store.addNode({ x: 200, y: 0 });
    const c = store.addNode({ x: 0, y: 200 });
    const d = store.addNode({ x: 200, y: 200 });
    store.addEdge(a, b);
    store.addEdge(c, d);
    const [ab, cd] = useDiagramStore.getState().diagram.edges.map((e) => e.id);

    const { result } = renderBuilder();
    const before = new Map(result.current.rfEdges.map((e) => [e.id, e]));

    act(() => useDiagramStore.getState().dragNodes([{ id: d, position: { x: 260, y: 240 } }]));

    const after = new Map(result.current.rfEdges.map((e) => [e.id, e]));
    expect(after.get(ab)).toBe(before.get(ab));
    expect(after.get(cd)).not.toBe(before.get(cd));
  });
});
