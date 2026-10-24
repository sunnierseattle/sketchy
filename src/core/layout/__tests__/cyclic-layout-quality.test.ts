import { describe, expect, it } from 'vitest';
import type { DiagramEdge, DiagramNode } from '../../types';
import { autoLayout } from '../auto-layout';
import { elkEngine } from '../elk-engine';
import { prepareLayoutNodes } from '../layout-inputs';
import { computeLayoutMetrics } from '../layout-metrics';

/**
 * A 25-variable causal loop diagram: overlapping loops of 3-6 variables plus a
 * few extra links, with realistic label lengths. Deterministic.
 */
function realisticCld(n = 25, seed = 41) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const words = 'cost demand quality delay staff morale backlog churn revenue pricing training errors rework capacity'.split(' ');
  const nodes: DiagramNode[] = Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: {
      label: Array.from({ length: 2 + Math.floor(rnd() * 7) }, () => words[Math.floor(rnd() * words.length)]).join(' '),
      tags: [],
      junctionType: 'or',
    },
  }));
  const edges: DiagramEdge[] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number) => {
    if (a === b || seen.has(`${a}>${b}`)) return;
    seen.add(`${a}>${b}`);
    edges.push({ id: `e${edges.length}`, source: `c${a}`, target: `c${b}` });
  };
  for (let i = 0; i < n;) {
    const len = 3 + Math.floor(rnd() * 4);
    const loop = Array.from({ length: len }, (_, k) => (k === 0 && i > 0 ? Math.floor(rnd() * i) : Math.min(n - 1, i + k)));
    loop.forEach((a, k) => add(a, loop[(k + 1) % loop.length]));
    i += len - 1;
  }
  for (let k = 0; k < Math.round(n * 0.25); k++) add(Math.floor(rnd() * n), Math.floor(rnd() * n));
  return { nodes, edges };
}

describe('cyclic layout quality', () => {
  it('lays out a realistic causal loop diagram with few crossings and no overlaps', async () => {
    const { nodes, edges } = realisticCld();
    const updates = await autoLayout(nodes, edges, { direction: 'TB', cyclic: true }, elkEngine);
    const positions = new Map(updates.map((u) => [u.id, u.position]));
    const metrics = computeLayoutMetrics(
      prepareLayoutNodes(nodes, edges),
      edges.map((e) => ({ source: e.source, target: e.target })),
      positions,
      { layoutDirection: 'TB' },
    );

    // Measured on this graph: force 56 crossings / 3 edges through nodes,
    // stress + overlap removal 14 / 0.
    expect(metrics.nodeOverlaps).toBe(0);
    expect(metrics.edgeNodeOverlaps).toBeLessThanOrEqual(1);
    expect(metrics.edgeCrossings).toBeLessThanOrEqual(20);
  });
});
