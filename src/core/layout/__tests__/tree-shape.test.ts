import { describe, expect, it } from 'vitest';
import { classifyTreeShape, computeOutTreeDepths } from '../tree-shape';

const e = (source: string, target: string) => ({ source, target });

describe('classifyTreeShape', () => {
  it('recognizes an out-tree (each node has at most one parent edge in)', () => {
    expect(classifyTreeShape(['r', 'a', 'b', 'a1'], [e('r', 'a'), e('r', 'b'), e('a', 'a1')])).toBe('out-tree');
  });

  it('recognizes an in-tree (causes converge on one effect)', () => {
    expect(classifyTreeShape(['r', 'a', 'b', 'a1'], [e('a', 'r'), e('b', 'r'), e('a1', 'a')])).toBe('in-tree');
  });

  it('treats a forest with isolated nodes as a tree', () => {
    expect(classifyTreeShape(['r', 'a', 'x', 'y'], [e('r', 'a')])).toBe('out-tree');
  });

  it('rejects a node with two parents (a cross-link)', () => {
    expect(classifyTreeShape(['r', 'a', 'b', 'c'], [e('r', 'a'), e('r', 'b'), e('a', 'c'), e('b', 'c')])).toBeNull();
  });

  it('rejects a graph that is cyclic', () => {
    expect(classifyTreeShape(['a', 'b'], [e('a', 'b'), e('b', 'a')])).toBeNull();
  });

  it('rejects mixed directions that form an undirected cycle', () => {
    // b has two parents (a and c), and a-b-c forms a cycle when direction is ignored.
    expect(classifyTreeShape(['a', 'b', 'c'], [e('a', 'b'), e('c', 'b'), e('a', 'c')])).toBeNull();
  });

  it('returns null for an empty edge list', () => {
    expect(classifyTreeShape(['a', 'b'], [])).toBeNull();
  });
});

describe('computeOutTreeDepths', () => {
  it('measures depth from each root along parent -> child edges', () => {
    const depths = computeOutTreeDepths(['r', 'a', 'b', 'a1', 'x'], [e('r', 'a'), e('r', 'b'), e('a', 'a1')]);
    expect(Object.fromEntries(depths)).toEqual({ r: 0, a: 1, b: 1, a1: 2, x: 0 });
  });
});
