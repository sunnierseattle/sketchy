import type { Diagram } from '../core/types';
import type { DiagramSnapshot } from './diagram-store-types';

export function snapshot(state: { diagram: Diagram }): DiagramSnapshot {
  return {
    nodes: state.diagram.nodes,
    edges: state.diagram.edges,
    annotations: state.diagram.annotations,
    frameworkId: state.diagram.frameworkId,
    settings: state.diagram.settings,
  };
}

/**
 * Apply an undo/redo snapshot to the current diagram.
 *
 * Settings are not otherwise tracked by history, so they are only restored
 * when the snapshot crosses a framework switch (which replaces them). This
 * keeps an unrelated undo from reverting a settings change made later.
 */
export function restoreSnapshot(diagram: Diagram, snap: DiagramSnapshot): Diagram {
  const frameworkChanged = snap.frameworkId !== diagram.frameworkId;
  return {
    ...diagram,
    nodes: snap.nodes,
    edges: snap.edges,
    annotations: snap.annotations,
    frameworkId: snap.frameworkId,
    settings: frameworkChanged ? snap.settings : diagram.settings,
  };
}
