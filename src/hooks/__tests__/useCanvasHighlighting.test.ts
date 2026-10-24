import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasHighlighting } from '../useCanvasHighlighting';
import { useDiagramStore } from '../../store/diagram-store';
import { useUIStore } from '../../store/ui-store';
import { resetDiagramAndUIStores } from '../../test/store-fixtures';

describe('useCanvasHighlighting', () => {
  beforeEach(() => resetDiagramAndUIStores());

  it('highlights the connected subgraph of a single selected diagram node', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const b = store.addNode({ x: 100, y: 0 });
    store.addEdge(a, b);

    act(() => useUIStore.getState().setSelectedNodes([a]));
    const { result } = renderHook(() => useCanvasHighlighting());

    expect(result.current.highlightSets?.nodeIds).toEqual(new Set([a, b]));
  });

  it('does not highlight (and so does not dim nodes) when an annotation is selected', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const b = store.addNode({ x: 100, y: 0 });
    store.addEdge(a, b);
    const annotationId = store.addAnnotation('text', { x: 300, y: 300 });

    act(() => useUIStore.getState().setSelectedNodes([annotationId]));
    const { result } = renderHook(() => useCanvasHighlighting());

    expect(result.current.highlightSets).toBeNull();
  });

  it('highlights the node when one node and an annotation are selected together', () => {
    const store = useDiagramStore.getState();
    const a = store.addNode({ x: 0, y: 0 });
    const annotationId = store.addAnnotation('text', { x: 300, y: 300 });

    act(() => useUIStore.getState().setSelectedNodes([a, annotationId]));
    const { result } = renderHook(() => useCanvasHighlighting());

    expect(result.current.highlightSets?.nodeIds).toEqual(new Set([a]));
  });
});
