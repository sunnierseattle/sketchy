import { describe, expect, it } from 'vitest';
import { MAX_TOTAL_LOOPS, findCausalLoops, findCausalLoopsWithStatus } from '../derived';
import type { DiagramEdge } from '../../types';

/** Every ordered pair connected: far more than MAX_TOTAL_LOOPS cycles. */
function completeDigraph(n: number): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a !== b) edges.push({ id: `e${a}-${b}`, source: `n${a}`, target: `n${b}` });
    }
  }
  return edges;
}

describe('findCausalLoopsWithStatus', () => {
  it('reports truncation when there are more loops than the cap', () => {
    const { loops, truncated } = findCausalLoopsWithStatus(completeDigraph(7));
    expect(loops).toHaveLength(MAX_TOTAL_LOOPS);
    expect(truncated).toBe(true);
  });

  it('does not report truncation for a small diagram', () => {
    const { loops, truncated } = findCausalLoopsWithStatus(completeDigraph(3));
    expect(loops.length).toBeLessThan(MAX_TOTAL_LOOPS);
    expect(truncated).toBe(false);
  });

  it('findCausalLoops still returns at most the cap', () => {
    expect(findCausalLoops(completeDigraph(7))).toHaveLength(MAX_TOTAL_LOOPS);
  });
});
