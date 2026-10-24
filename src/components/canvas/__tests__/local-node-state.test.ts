import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { mergeRFEdgesWithLocalState, mergeRFNodesWithLocalState } from '../local-node-state';

const data = { label: 'A' };
const position = { x: 0, y: 0 };

describe('mergeRFNodesWithLocalState', () => {
  it('keeps the previous local node object when the incoming node is unchanged', () => {
    const rf: Node = { id: 'a', type: 'entity', position, data };
    const [first] = mergeRFNodesWithLocalState([], [rf]);
    const prevLocal = { ...first, selected: true, measured: { width: 160, height: 60 } };

    const [merged] = mergeRFNodesWithLocalState([prevLocal], [rf]);

    expect(merged).toBe(prevLocal);
  });

  it('creates a new object, keeping selection and size, when the node changed', () => {
    const prevLocal: Node = {
      id: 'a', type: 'entity', position, data, selected: true, measured: { width: 160, height: 60 },
    };
    const moved: Node = { id: 'a', type: 'entity', position: { x: 10, y: 0 }, data };

    const [merged] = mergeRFNodesWithLocalState([prevLocal], [moved]);

    expect(merged).not.toBe(prevLocal);
    expect(merged.position).toEqual({ x: 10, y: 0 });
    expect(merged.selected).toBe(true);
    expect(merged.measured).toEqual({ width: 160, height: 60 });
  });

  it('does not keep measured size for annotations', () => {
    const prevLocal: Node = {
      id: 'n', type: 'annotation-text', position, data, measured: { width: 10, height: 10 }, width: 10, height: 10,
    };
    const resized: Node = { id: 'n', type: 'annotation-text', position, data, width: 50, height: 20 };

    const [merged] = mergeRFNodesWithLocalState([prevLocal], [resized]);

    expect(merged.width).toBe(50);
    expect(merged.measured).toBeUndefined();
  });
});

describe('mergeRFEdgesWithLocalState', () => {
  it('keeps the previous local edge object when the incoming edge is unchanged', () => {
    const rf: Edge = { id: 'e', source: 'a', target: 'b', className: 'x' };
    const [first] = mergeRFEdgesWithLocalState([], [rf]);
    const prevLocal = { ...first, selected: true };

    const [merged] = mergeRFEdgesWithLocalState([prevLocal], [rf]);

    expect(merged).toBe(prevLocal);
  });

  it('creates a new edge object, keeping selection, when the edge changed', () => {
    const prevLocal: Edge = { id: 'e', source: 'a', target: 'b', className: 'x', selected: true };
    const changed: Edge = { id: 'e', source: 'a', target: 'b', className: 'y' };

    const [merged] = mergeRFEdgesWithLocalState([prevLocal], [changed]);

    expect(merged).not.toBe(prevLocal);
    expect(merged.className).toBe('y');
    expect(merged.selected).toBe(true);
  });

  it('starts new edges unselected', () => {
    const [merged] = mergeRFEdgesWithLocalState([], [{ id: 'e', source: 'a', target: 'b' }]);
    expect(merged.selected).toBe(false);
  });
});
