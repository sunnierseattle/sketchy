import { DEFAULT_EDGE_ROUTING_CONFIG, DEFAULT_EDGE_ROUTING_POLICY } from '../core/edge-routing';
import { findExistingEdge, validateEdge } from '../core/graph/validation';
import { resolveFramework } from './diagram-framework';
import {
  resolveEdgeSides,
  captureOptimizedEdgeSides,
} from './diagram-edge-routing';
import { type Framework } from '../core/framework-types';
import type { DiagramEdge } from '../core/types';
import type { DiagramState, DiagramStoreContext } from './diagram-store-types';
import { applyTargetJunctionDefault, buildDiagramEdge } from './diagram-edge-factory';

function createEdgeRoutingConfig(framework: Framework) {
  return framework.allowsCycles
    ? { ...DEFAULT_EDGE_ROUTING_CONFIG, flowAlignedBonus: 0 }
    : DEFAULT_EDGE_ROUTING_CONFIG;
}

export function createDiagramEdgeActions(
  context: DiagramStoreContext,
): Pick<
  DiagramState,
  | 'addEdge'
  | 'deleteEdges'
  | 'setEdgeConfidence'
  | 'setEdgePolarity'
  | 'setEdgeDelay'
  | 'setEdgeTag'
  | 'updateEdgeNotes'
  | 'commitEdgeNotes'
  | 'optimizeEdges'
  | 'optimizeEdgesAfterLayout'
> {
  const { applyDiagramChange, get, set, setDiagram, pushHistorySnapshot, undoState, updateEdges } = context;

  function setEdgeField<K extends keyof DiagramEdge>(
    field: K,
    options: { coerceEmpty?: boolean } = {},
  ) {
    return (id: string, value: DiagramEdge[K]) => {
      const finalValue = options.coerceEmpty ? ((value as unknown) || undefined) : value;
      updateEdges(
        (edge) => (edge.id === id ? { ...edge, [field]: finalValue } : edge),
        { trackHistory: true },
      );
    };
  }

  return {
    addEdge: (source, target, handles) => {
      const state = get();

      const existing = findExistingEdge(state.diagram.edges, source, target);
      if (existing) {
        const newSides = resolveEdgeSides(source, target, state.diagram.nodes, state.diagram.settings, handles);
        const existingSides = resolveEdgeSides(source, target, state.diagram.nodes, state.diagram.settings, {
          sourceHandleId: existing.sourceSide ? `source-${existing.sourceSide}` : undefined,
          targetHandleId: existing.targetSide ? `target-${existing.targetSide}` : undefined,
        });

        if (newSides.sourceSide === existingSides.sourceSide &&
            newSides.targetSide === existingSides.targetSide) {
          return { success: false, reason: 'Edge already exists' };
        }

        if (state.diagram.settings.edgeRoutingMode === 'dynamic') {
          return { success: false, reason: 'dynamic-edge-move' };
        }

        pushHistorySnapshot();
        set((storeState) => ({
          diagram: {
            ...storeState.diagram,
            edges: storeState.diagram.edges.map((edge) =>
              edge.id === existing.id ? { ...edge, ...newSides } : edge,
            ),
          },
          ...undoState,
        }));
        return { success: true, reason: 'Edge moved' };
      }

      const framework = resolveFramework(state.diagram.frameworkId);
      const result = validateEdge(state.diagram.edges, source, target, {
        allowCycles: framework.allowsCycles,
      });

      if (!result.valid) {
        return { success: false, reason: result.reason };
      }

      pushHistorySnapshot();

      const edge: DiagramEdge = buildDiagramEdge({
        source,
        target,
        framework,
        nodes: state.diagram.nodes,
        settings: state.diagram.settings,
        handles,
      });

      set((storeState) => {
        const edges = [...storeState.diagram.edges, edge];
        return {
          diagram: {
            ...storeState.diagram,
            nodes: applyTargetJunctionDefault(storeState.diagram.nodes, edges, target, framework),
            edges,
          },
          ...undoState,
        };
      });

      return { success: true };
    },

    deleteEdges: (ids) => {
      const idSet = new Set(ids);
      applyDiagramChange(
        (diagram) => ({
          ...diagram,
          edges: diagram.edges.filter((edge) => !idSet.has(edge.id)),
        }),
        { trackHistory: true },
      );
    },

    setEdgeConfidence: setEdgeField('confidence'),
    setEdgePolarity: setEdgeField('polarity'),
    setEdgeDelay: setEdgeField('delay'),
    setEdgeTag: setEdgeField('edgeTag', { coerceEmpty: true }),

    updateEdgeNotes: (id, notes) => {
      updateEdges((edge) => (
        edge.id === id ? { ...edge, notes: notes || undefined } : edge
      ));
    },

    commitEdgeNotes: setEdgeField('notes', { coerceEmpty: true }),

    optimizeEdges: () => {
      const state = get();
      if (state.diagram.settings.edgeRoutingMode !== 'fixed') return false;

      const optimizedEdges = captureOptimizedEdgeSides(
        state.diagram.edges,
        state.diagram.nodes,
        state.diagram.settings,
        DEFAULT_EDGE_ROUTING_POLICY,
        createEdgeRoutingConfig(resolveFramework(state.diagram.frameworkId)),
      );
      const changed = optimizedEdges.some((edge, index) => {
        const current = state.diagram.edges[index];
        return edge.sourceSide !== current?.sourceSide || edge.targetSide !== current?.targetSide;
      });

      if (!changed) return false;

      applyDiagramChange(
        (diagram) => ({ ...diagram, edges: optimizedEdges }),
        { trackHistory: true },
      );
      return true;
    },

    optimizeEdgesAfterLayout: () => {
      const state = get();
      if (state.diagram.settings.edgeRoutingMode !== 'fixed') return;

      const optimizedEdges = captureOptimizedEdgeSides(
        state.diagram.edges,
        state.diagram.nodes,
        state.diagram.settings,
        DEFAULT_EDGE_ROUTING_POLICY,
        createEdgeRoutingConfig(resolveFramework(state.diagram.frameworkId)),
      );
      setDiagram((diagram) => ({ ...diagram, edges: optimizedEdges }));
    },
  };
}
