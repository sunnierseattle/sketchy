import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from '../diagram-store';
import { addTestNodes, addTwoConnectedTestNodes, resetDiagramAndUIStores } from '../../test/store-fixtures';

describe('diagram-store-edge-actions', () => {
  beforeEach(() => {
    resetDiagramAndUIStores();
  });

  describe('deleteEdges', () => {
    it('removes an edge by id', () => {
      const { edgeId } = addTwoConnectedTestNodes();
      expect(useDiagramStore.getState().diagram.edges).toHaveLength(1);

      useDiagramStore.getState().deleteEdges([edgeId]);

      expect(useDiagramStore.getState().diagram.edges).toHaveLength(0);
    });

    it('removes multiple edges', () => {
      const [id1, id2, id3] = addTestNodes(3, 200);
      useDiagramStore.getState().addEdge(id1, id2);
      useDiagramStore.getState().addEdge(id2, id3);
      const edges = useDiagramStore.getState().diagram.edges;
      expect(edges).toHaveLength(2);

      useDiagramStore.getState().deleteEdges([edges[0].id, edges[1].id]);

      expect(useDiagramStore.getState().diagram.edges).toHaveLength(0);
    });

    it('preserves nodes when deleting edges', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().deleteEdges([edgeId]);

      expect(useDiagramStore.getState().diagram.nodes).toHaveLength(2);
    });

    it('enables undo after deleting edges', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().deleteEdges([edgeId]);

      expect(useDiagramStore.getState().canUndo).toBe(true);
      useDiagramStore.getState().undo();
      expect(useDiagramStore.getState().diagram.edges).toHaveLength(1);
    });

    it('ignores non-existent edge ids', () => {
      addTwoConnectedTestNodes();

      useDiagramStore.getState().deleteEdges(['non-existent-id']);

      expect(useDiagramStore.getState().diagram.edges).toHaveLength(1);
    });
  });

  describe('setEdgeConfidence', () => {
    it('sets confidence to medium', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeConfidence(edgeId, 'medium');

      const edge = useDiagramStore.getState().diagram.edges[0];
      expect(edge.confidence).toBe('medium');
    });

    it('sets confidence to low', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeConfidence(edgeId, 'low');

      expect(useDiagramStore.getState().diagram.edges[0].confidence).toBe('low');
    });

    it('tracks history for undo', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeConfidence(edgeId, 'low');

      expect(useDiagramStore.getState().canUndo).toBe(true);
      useDiagramStore.getState().undo();
      expect(useDiagramStore.getState().diagram.edges[0].confidence).toBeUndefined();
    });
  });

  describe('setEdgePolarity', () => {
    it('sets polarity on a CLD edge', () => {
      useDiagramStore.getState().setFramework('cld');
      const id1 = useDiagramStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useDiagramStore.getState().addNode({ x: 0, y: 200 });
      useDiagramStore.getState().addEdge(id1, id2);
      const edgeId = useDiagramStore.getState().diagram.edges[0].id;

      useDiagramStore.getState().setEdgePolarity(edgeId, 'negative');

      expect(useDiagramStore.getState().diagram.edges[0].polarity).toBe('negative');
    });

    it('tracks history for undo', () => {
      useDiagramStore.getState().setFramework('cld');
      const id1 = useDiagramStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useDiagramStore.getState().addNode({ x: 0, y: 200 });
      useDiagramStore.getState().addEdge(id1, id2);
      const edgeId = useDiagramStore.getState().diagram.edges[0].id;

      useDiagramStore.getState().setEdgePolarity(edgeId, 'negative');
      useDiagramStore.getState().undo();

      expect(useDiagramStore.getState().diagram.edges[0].polarity).toBe('positive');
    });
  });

  describe('setEdgeDelay', () => {
    it('sets delay on a CLD edge', () => {
      useDiagramStore.getState().setFramework('cld');
      const id1 = useDiagramStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useDiagramStore.getState().addNode({ x: 0, y: 200 });
      useDiagramStore.getState().addEdge(id1, id2);
      const edgeId = useDiagramStore.getState().diagram.edges[0].id;

      useDiagramStore.getState().setEdgeDelay(edgeId, true);

      expect(useDiagramStore.getState().diagram.edges[0].delay).toBe(true);
    });

    it('removes delay', () => {
      useDiagramStore.getState().setFramework('cld');
      const id1 = useDiagramStore.getState().addNode({ x: 0, y: 0 });
      const id2 = useDiagramStore.getState().addNode({ x: 0, y: 200 });
      useDiagramStore.getState().addEdge(id1, id2);
      const edgeId = useDiagramStore.getState().diagram.edges[0].id;

      useDiagramStore.getState().setEdgeDelay(edgeId, true);
      useDiagramStore.getState().setEdgeDelay(edgeId, false);

      expect(useDiagramStore.getState().diagram.edges[0].delay).toBe(false);
    });
  });

  describe('setEdgeTag', () => {
    it('sets an edge tag', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeTag(edgeId, 'critical');

      expect(useDiagramStore.getState().diagram.edges[0].edgeTag).toBe('critical');
    });

    it('clears edge tag when given empty string', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeTag(edgeId, 'critical');
      useDiagramStore.getState().setEdgeTag(edgeId, '');

      expect(useDiagramStore.getState().diagram.edges[0].edgeTag).toBeUndefined();
    });

    it('tracks history for undo', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().setEdgeTag(edgeId, 'critical');
      useDiagramStore.getState().undo();

      expect(useDiagramStore.getState().diagram.edges[0].edgeTag).toBeUndefined();
    });
  });

  describe('updateEdgeNotes', () => {
    it('sets notes on an edge without tracking history', () => {
      const { edgeId } = addTwoConnectedTestNodes();
      // Reset undo state
      useDiagramStore.setState({ canUndo: false, canRedo: false });

      useDiagramStore.getState().updateEdgeNotes(edgeId, 'Some notes');

      expect(useDiagramStore.getState().diagram.edges[0].notes).toBe('Some notes');
      // updateEdgeNotes does NOT track history (live typing)
      expect(useDiagramStore.getState().canUndo).toBe(false);
    });

    it('clears notes when given empty string', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().updateEdgeNotes(edgeId, 'Some notes');
      useDiagramStore.getState().updateEdgeNotes(edgeId, '');

      expect(useDiagramStore.getState().diagram.edges[0].notes).toBeUndefined();
    });
  });

  describe('commitEdgeNotes', () => {
    it('commits notes with history tracking', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().commitEdgeNotes(edgeId, 'Final notes');

      expect(useDiagramStore.getState().diagram.edges[0].notes).toBe('Final notes');
      expect(useDiagramStore.getState().canUndo).toBe(true);
    });

    it('undoes committed notes', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().commitEdgeNotes(edgeId, 'Final notes');
      useDiagramStore.getState().undo();

      expect(useDiagramStore.getState().diagram.edges[0].notes).toBeUndefined();
    });

    it('clears notes when committing empty string', () => {
      const { edgeId } = addTwoConnectedTestNodes();

      useDiagramStore.getState().commitEdgeNotes(edgeId, 'Some text');
      useDiagramStore.getState().commitEdgeNotes(edgeId, '');

      expect(useDiagramStore.getState().diagram.edges[0].notes).toBeUndefined();
    });
  });
});
