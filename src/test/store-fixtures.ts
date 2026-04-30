import { useDiagramStore } from '../store/diagram-store';
import { useUIStore } from '../store/ui-store';
import type { DiagramState } from '../store/diagram-store-types';

type UIStoreSnapshot = ReturnType<typeof useUIStore.getState>;

interface ResetStoreOptions {
  frameworkId?: string;
  diagram?: Partial<DiagramState['diagram']>;
  ui?: Partial<UIStoreSnapshot>;
}

const DEFAULT_UI_STATE = {
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectedLoopId: null,
  contextMenu: null,
  sidePanelOpen: true,
  chatPanelMode: 'shared',
  interactionMode: 'select',
  pendingAnnotationTool: null,
  searchQuery: '',
} satisfies Partial<UIStoreSnapshot>;

export function resetDiagramAndUIStores({
  frameworkId = 'crt',
  diagram,
  ui,
}: ResetStoreOptions = {}) {
  const store = useDiagramStore.getState();
  store.setFramework(frameworkId);
  store.newDiagram();
  useDiagramStore.setState((state) => ({
    diagram: {
      ...state.diagram,
      nodes: [],
      edges: [],
      annotations: [],
      ...diagram,
    },
    canUndo: false,
    canRedo: false,
  }));
  useUIStore.setState({
    ...DEFAULT_UI_STATE,
    ...ui,
  });
}

function addTestNode(position = { x: 0, y: 0 }) {
  return useDiagramStore.getState().addNode(position);
}

export function addTestNodes(count: number, gap = 100) {
  return Array.from({ length: count }, (_, index) =>
    addTestNode({ x: index * gap, y: index * gap }),
  );
}

function addTestEdge(source: string, target: string) {
  useDiagramStore.getState().addEdge(source, target);
  return useDiagramStore.getState().diagram.edges.at(-1)!.id;
}

export function addTwoConnectedTestNodes() {
  const [id1, id2] = addTestNodes(2, 200);
  const edgeId = addTestEdge(id1, id2);
  return { id1, id2, edgeId };
}
