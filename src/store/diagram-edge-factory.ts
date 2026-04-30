import { getDefaultJunctionType } from '../core/framework-types';
import type {
  DiagramEdge,
  DiagramNode,
  DiagramSettings,
  EdgeConfidence,
  EdgePolarity,
  JunctionType,
} from '../core/types';
import type { Framework } from '../core/framework-types';
import { getDefaultEdgeFields } from './diagram-framework';
import { resolveEdgeSides } from './diagram-edge-routing';

interface BuildEdgeOptions {
  id?: string;
  source: string;
  target: string;
  framework: Framework;
  nodes: DiagramNode[];
  settings: DiagramSettings;
  handles?: {
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
  };
  confidence?: EdgeConfidence;
  polarity?: EdgePolarity;
  delay?: boolean;
  notes?: string;
  includeDefaultFields?: boolean;
}

export function buildDiagramEdge({
  id = crypto.randomUUID(),
  source,
  target,
  framework,
  nodes,
  settings,
  handles,
  confidence,
  polarity,
  delay,
  notes,
  includeDefaultFields = true,
}: BuildEdgeOptions): DiagramEdge {
  return {
    id,
    source,
    target,
    ...(settings.edgeRoutingMode === 'fixed'
      ? resolveEdgeSides(source, target, nodes, settings, handles)
      : {}),
    ...(includeDefaultFields ? getDefaultEdgeFields(framework) : {}),
    ...(confidence && confidence !== 'high' ? { confidence } : {}),
    ...(framework.supportsEdgePolarity && (polarity !== undefined || !includeDefaultFields)
      ? { polarity: polarity ?? (includeDefaultFields ? undefined : 'positive') }
      : {}),
    ...(framework.supportsEdgeDelay && delay !== undefined ? { delay } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function applyTargetJunctionDefault(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  target: string,
  framework: Framework,
) {
  const incomingCount = edges.filter((edge) => edge.target === target).length;
  if (!framework.supportsJunctions || incomingCount !== 2) return nodes;

  const defaultJunction = getDefaultJunctionType(framework) as JunctionType;
  return nodes.map((node) =>
    node.id === target
      ? { ...node, data: { ...node.data, junctionType: defaultJunction } }
      : node,
  );
}
