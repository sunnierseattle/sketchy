import type { Diagram } from '../types';
import type { Framework } from '../framework-types';
import { validateGraph, type EdgeDropReason } from '../graph/validation';
import { getFramework } from '../../frameworks/registry';
import { migrate, validateDiagramShape } from './schema';

export function migrateDiagramShape(raw: unknown): Diagram | null {
  if (!validateDiagramShape(raw)) {
    return null;
  }

  return migrate(raw as unknown as Record<string, unknown>);
}

interface NormalizedDiagramResult {
  diagram: Diagram;
  framework: Framework | null;
  warnings: string[];
}

/** Builds the user-facing warning; `details` explains why connections were dropped. */
type InvalidConnectionsWarning = (droppedCount: number, details: string) => string;

const DROP_REASON_TEXT: Record<EdgeDropReason, string> = {
  'missing-node': 'pointed to a missing node',
  'self-loop': 'connected a node to itself',
  duplicate: 'duplicate',
  cycle: 'would create a cycle',
};

function describeDropReasons(reasons: EdgeDropReason[]): string {
  const counts = new Map<EdgeDropReason, number>();
  for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts].map(([reason, count]) => `${count} ${DROP_REASON_TEXT[reason]}`).join(', ');
}

function dedupeById<T extends { id: string }>(items: T[]): { items: T[]; removed: number } {
  const seen = new Set<string>();
  const kept = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return { items: kept.length === items.length ? items : kept, removed: items.length - kept.length };
}

export function normalizeLoadedDiagram(
  diagram: Diagram,
  invalidConnectionsWarning: InvalidConnectionsWarning,
): NormalizedDiagramResult {
  const framework = getFramework(diagram.frameworkId) ?? null;
  const warnings: string[] = [];

  if (!framework) {
    warnings.push(`Unknown framework "${diagram.frameworkId}" — loading as generic diagram`);
  }

  const nodes = dedupeById(diagram.nodes);
  const annotations = dedupeById(diagram.annotations ?? []);
  const edges = dedupeById(diagram.edges);
  const duplicates: [number, string][] = [
    [nodes.removed, 'node(s)'],
    [edges.removed, 'connection(s)'],
    [annotations.removed, 'annotation(s)'],
  ];
  for (const [removed, what] of duplicates) {
    if (removed > 0) warnings.push(`Removed ${removed} ${what} with a duplicate ID.`);
  }

  const graphResult = validateGraph(nodes.items, edges.items, {
    allowCycles: framework?.allowsCycles,
  });
  if (!graphResult.valid) {
    warnings.push(invalidConnectionsWarning(
      graphResult.droppedEdges.length,
      describeDropReasons(graphResult.dropReasons),
    ));
  }

  const hadDuplicates = duplicates.some(([removed]) => removed > 0);
  if (!hadDuplicates && graphResult.valid) {
    return { diagram, framework, warnings };
  }

  const droppedEdges = new Set(graphResult.droppedEdges);
  return {
    diagram: {
      ...diagram,
      nodes: nodes.items,
      annotations: annotations.items,
      edges: edges.items.filter((edge) => !droppedEdges.has(edge)),
    },
    framework,
    warnings,
  };
}
