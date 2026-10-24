import type { LayoutEngine } from './layout-engine';
import { DEFAULT_ELK_EXPERIMENT_SETTINGS, type ElkAlgorithm, type ElkExperimentSettings } from './elk-options';
import { classifyTreeShape, computeOutTreeDepths } from './tree-shape';
import type { LayoutDirection } from '../framework-types';

import ELK from 'elkjs/lib/elk.bundled.js';

const elkInstance = new ELK();

const DIRECTION_MAP: Record<string, string> = {
  TB: 'DOWN',
  BT: 'UP',
  LR: 'RIGHT',
  RL: 'LEFT',
};

export function getDefaultElkAlgorithm(cyclic?: boolean): ElkAlgorithm {
  return cyclic ? 'force' : 'layered';
}

export function resolveElkAlgorithm(
  algorithmOverride: ElkAlgorithm | null | undefined,
  cyclic?: boolean,
): ElkAlgorithm {
  return algorithmOverride ?? getDefaultElkAlgorithm(cyclic);
}

function createElkEngine(algorithm: ElkAlgorithm): LayoutEngine {
  return async (nodes, edges, options) => {
    const hasPositions = nodes.some((node) => node.position);
    const cyclic = options.cyclic === true;
    const isLayered = algorithm === 'layered';
    const elkOptions = { ...DEFAULT_ELK_EXPERIMENT_SETTINGS, ...options.elk };

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': algorithm,
        'elk.direction': DIRECTION_MAP[options.direction] ?? 'DOWN',
        'elk.spacing.nodeNode': String(elkOptions.nodeSpacing),
        'elk.separateConnectedComponents': String(elkOptions.separateConnectedComponents),
        'elk.spacing.componentComponent': String(elkOptions.componentSpacing),
        'elk.aspectRatio': String(elkOptions.aspectRatio),
        ...(isLayered && {
          'elk.edgeRouting': cyclic ? 'SPLINES' : 'ORTHOGONAL',
          'elk.layered.spacing.nodeNodeBetweenLayers': String(elkOptions.componentSpacing),
          'elk.layered.layering.strategy': elkOptions.layeringStrategy,
          'elk.layered.nodePlacement.strategy': elkOptions.nodePlacementStrategy,
          'elk.layered.nodePlacement.bk.fixedAlignment': elkOptions.bkFixedAlignment,
          'elk.layered.cycleBreaking.strategy': elkOptions.cycleBreakingStrategy,
          'elk.layered.wrapping.strategy': elkOptions.wrappingStrategy,
          'elk.layered.thoroughness': String(elkOptions.thoroughness),
        }),
        ...(cyclic && isLayered && {
          'elk.layered.feedbackEdges': String(elkOptions.feedbackEdges),
          'elk.layered.nodePlacement.favorStraightEdges': String(elkOptions.favorStraightEdges),
          'elk.layered.priority.straightness': String(elkOptions.straightnessPriority),
        }),
        ...(hasPositions && isLayered && {
          'elk.layered.crossingMinimization.semiInteractive': 'true',
        }),
      },
      children: nodes.map((node) => ({
        id: node.id,
        width: node.width,
        height: node.height,
        ...(node.position && { x: node.position.x, y: node.position.y }),
        ...(node.locked && isLayered && {
          layoutOptions: {
            'elk.position': `(${node.position?.x ?? 0}, ${node.position?.y ?? 0})`,
            'elk.layered.layering.layerConstraint': 'NONE',
          },
        }),
      })),
      edges: edges.map((edge, index) => ({
        id: `e${index}`,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    const elk = elkInstance;

    let laid;
    try {
      laid = await elk.layout(graph);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Layout engine failed: ${msg}`, { cause: err });
    }

    return (laid.children ?? [])
      .filter((child) => child.x !== undefined && child.y !== undefined)
      .map((child) => ({
        id: child.id,
        x: child.x!,
        y: child.y!,
      }));
  };
}

const FLIPPED_DIRECTION: Record<LayoutDirection, LayoutDirection> = {
  TB: 'BT',
  BT: 'TB',
  LR: 'RL',
  RL: 'LR',
};

/**
 * Pure trees use ELK's dedicated tree algorithm, which centers every parent
 * over its children. mrtree expects parent -> child edges, so in-trees
 * (causes -> effect) are laid out reversed in the opposite direction, which
 * gives the same picture.
 */
const treeEngine: LayoutEngine = async (nodes, edges, options) => {
  const shape = classifyTreeShape(nodes.map((node) => node.id), edges);
  const reversed = shape === 'in-tree';
  const treeEdges = reversed
    ? edges.map((edge) => ({ ...edge, source: edge.target, target: edge.source }))
    : edges;
  const direction = reversed ? FLIPPED_DIRECTION[options.direction] : options.direction;
  const results = await createElkEngine('mrtree')(nodes, treeEdges, { ...options, direction });
  return spreadTreeLevels(results, nodes, treeEdges, direction, options.elk);
};

/**
 * mrtree uses one spacing value for siblings and levels. Push each level
 * further along the flow so levels get the same gap as layered layouts,
 * leaving room for edges and junction symbols.
 */
function spreadTreeLevels(
  results: { id: string; x: number; y: number }[],
  nodes: { id: string }[],
  treeEdges: { source: string; target: string }[],
  direction: LayoutDirection,
  elk: Partial<ElkExperimentSettings> | undefined,
): { id: string; x: number; y: number }[] {
  const settings = { ...DEFAULT_ELK_EXPERIMENT_SETTINGS, ...elk };
  const extra = Math.max(0, settings.componentSpacing - settings.nodeSpacing);
  const depths = computeOutTreeDepths(nodes.map((node) => node.id), treeEdges);
  const sign = direction === 'TB' || direction === 'LR' ? 1 : -1;
  const vertical = direction === 'TB' || direction === 'BT';
  return results.map((r) => {
    const shift = sign * extra * (depths.get(r.id) ?? 0);
    return vertical ? { ...r, y: r.y + shift } : { ...r, x: r.x + shift };
  });
}

export const elkEngine: LayoutEngine = async (nodes, edges, options) => {
  const override = options.elk?.algorithmOverride ?? DEFAULT_ELK_EXPERIMENT_SETTINGS.algorithmOverride;
  const algorithm = resolveElkAlgorithm(override, options.cyclic);
  if (!override && algorithm === 'layered' && classifyTreeShape(nodes.map((node) => node.id), edges)) {
    return treeEngine(nodes, edges, options);
  }
  return createElkEngine(algorithm)(nodes, edges, options);
};
