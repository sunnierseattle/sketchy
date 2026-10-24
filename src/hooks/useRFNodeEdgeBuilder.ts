import { useMemo, useState } from 'react';
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { DEFAULT_EDGE_ROUTING_CONFIG, DEFAULT_EDGE_ROUTING_POLICY } from '../core/edge-routing';
import { useDiagramStore, useFramework } from '../store/diagram-store';
import { useUIStore } from '../store/ui-store';
import { markdownToPlainText } from '../core/text/plain-text';
import { useSettingsStore } from '../store/settings-store';
import { getSourceHandleId, getTargetHandleId } from '../core/graph/ports';
import {
  getAutomaticEdgeSides,
  getStoredOrAutomaticEdgeSides,
} from '../store/diagram-edge-routing';
import { computeNodeHighlightState, computeEdgeLabel } from '../core/graph/rendering';
import { getTheme } from '../styles/themes';
import { ARROW_MARKER_SIZE } from '../constants/layout';
import type { ConnectedSubgraph, NamedCausalLoop, NodeDegrees } from '../core/graph/derived';
import { useDebouncedEdgePlacements } from './useDebouncedEdgePlacements';
import { createKeyedCache } from './rf-node-cache';
import type { Annotation, DiagramEdge, DiagramNode, DiagramSettings } from '../core/types';
import type { EdgeHandlePlacement } from '../core/graph/ports';
import type { Framework } from '../core/framework-types';
import { getLineNodeGeometry } from '../core/annotations/geometry';

interface BuilderResult {
  rfNodes: Node[];
  rfEdges: Edge[];
  defaultEdgeOptions: Record<string, unknown>;
  activeTheme: ReturnType<typeof getTheme>;
}

function annotationToRFNode(a: Annotation): Node {
  if (a.kind !== 'line') {
    return {
      id: a.id,
      type: `annotation-${a.kind}`,
      position: a.position,
      width: a.size.width,
      height: a.size.height,
      zIndex: -1,
      data: { ...a.data, kind: a.kind, size: a.size },
    };
  }

  const geometry = getLineNodeGeometry(a);

  return {
    id: a.id,
    type: 'annotation-line',
    position: geometry.position,
    width: geometry.size.width,
    height: geometry.size.height,
    draggable: false,
    zIndex: -1,
    data: {
      ...a.data,
      kind: a.kind,
      start: a.start,
      end: a.end,
      localStart: geometry.localStart,
      localEnd: geometry.localEnd,
      size: geometry.size,
    },
  };
}

interface EdgeBuildContext {
  /** The edge's own source and target nodes; side selection only needs these. */
  endpoints: DiagramNode[];
  placement: EdgeHandlePlacement | undefined;
  settings: DiagramSettings;
  edgeRoutingMode: string;
  framework: Framework;
  activeTheme: ReturnType<typeof getTheme>;
  highlight: 'highlighted' | 'dimmed' | 'none';
  selected: boolean;
  loopKind: string | undefined;
}

function buildRFEdge(e: DiagramEdge, ctx: EdgeBuildContext): Edge {
  const { sourceSide, targetSide } = ctx.edgeRoutingMode === 'fixed'
    ? getStoredOrAutomaticEdgeSides(e, ctx.endpoints, ctx.settings)
    : ctx.placement ?? getAutomaticEdgeSides(e.source, e.target, ctx.endpoints, ctx.settings);
  const targetNode = ctx.endpoints.find((n) => n.id === e.target);
  const edgeLabel = computeEdgeLabel(e, ctx.framework, targetNode?.data.junctionType);

  const rfEdge: Edge & { pathOptions: { borderRadius: number } } = {
    id: e.id,
    source: e.source,
    target: e.target,
    label: edgeLabel.label,
    labelShowBg: edgeLabel.showBg,
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 0,
    labelBgStyle: {
      fill: ctx.activeTheme.js.edgeLabelBg,
      stroke: 'var(--border)',
      strokeWidth: 1,
    },
    labelStyle: {
      fill: 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
    },
    sourceHandle: getSourceHandleId(sourceSide),
    targetHandle: getTargetHandleId(targetSide),
    pathOptions: { borderRadius: 100 },
    ...((ctx.selected || ctx.highlight === 'highlighted') && {
      markerEnd: { type: MarkerType.ArrowClosed, width: ARROW_MARKER_SIZE, height: ARROW_MARKER_SIZE, color: ctx.activeTheme.js.arrowColorSelected },
    }),
    className: [
      `edge-confidence-${e.confidence ?? 'high'}`,
      ctx.highlight === 'none' ? '' : `edge-${ctx.highlight}`,
      ctx.loopKind ? `edge-loop-${ctx.loopKind}` : '',
      ctx.selected ? 'edge-selected-animated' : '',
    ].join(' '),
  };
  return rfEdge;
}

export function useRFNodeEdgeBuilder(
  highlightSets: ConnectedSubgraph | null,
  selectedLoop: NamedCausalLoop | null,
  degreesMap: Map<string, NodeDegrees>,
  selectedDiagramNodeIds: string[],
): BuilderResult {
  const nodes = useDiagramStore((s) => s.diagram.nodes);
  const edges = useDiagramStore((s) => s.diagram.edges);
  const annotations = useDiagramStore((s) => s.diagram.annotations);
  const settings = useDiagramStore((s) => s.diagram.settings);
  const framework = useFramework();
  const edgeRoutingMode = settings?.edgeRoutingMode ?? 'dynamic';
  const selectedEdgeIds = useUIStore((s) => s.selectedEdgeIds);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const themeId = useSettingsStore((s) => s.theme);
  const activeTheme = useMemo(() => getTheme(themeId), [themeId]);
  const edgeRoutingConfig = useMemo(() => (
    framework.allowsCycles
      ? { ...DEFAULT_EDGE_ROUTING_CONFIG, flowAlignedBonus: 0 }
      : DEFAULT_EDGE_ROUTING_CONFIG
  ), [framework.allowsCycles]);
  const optimizedPlacements = useDebouncedEdgePlacements(
    edges,
    nodes,
    settings,
    DEFAULT_EDGE_ROUTING_POLICY,
    edgeRoutingConfig,
    edgeRoutingMode === 'dynamic',
  );

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: ARROW_MARKER_SIZE, height: ARROW_MARKER_SIZE, color: activeTheme.js.arrowColor },
    style: { strokeWidth: 2 },
  }), [activeTheme]);

  const searchLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery]);

  const highlightCtx = useMemo(() => ({
    searchLower,
    highlightSets,
    selectedNodeIds: selectedDiagramNodeIds,
    selectedEdgeIds,
    selectedLoopId: selectedLoop?.id ?? null,
  }), [searchLower, highlightSets, selectedDiagramNodeIds, selectedEdgeIds, selectedLoop]);

  const [nodeCache] = useState(() => createKeyedCache<Node>());

  const rfNodes: Node[] = useMemo(() => {
    nodeCache.retain(new Set([...annotations, ...nodes].map((item) => item.id)));
    return [
      ...annotations.map((a) => nodeCache.get(a.id, [a], () => annotationToRFNode(a))),
      ...nodes.map((n) => {
        const highlightState = computeNodeHighlightState(n.id, markdownToPlainText(n.data.label), highlightCtx);
        const loopKind = selectedLoop && highlightSets?.nodeIds.has(n.id) ? selectedLoop.kind : undefined;
        return nodeCache.get(n.id, [n, degreesMap, highlightState, loopKind], () => ({
          id: n.id,
          type: n.type,
          position: n.position,
          draggable: !n.data.locked,
          data: { ...n.data, degreesMap, highlightState, loopKind },
        }));
      }),
    ];
  }, [nodeCache, nodes, annotations, degreesMap, highlightSets, selectedLoop, highlightCtx]);

  const [edgeCache] = useState(() => createKeyedCache<Edge>());

  const rfEdges: Edge[] = useMemo(() => {
    edgeCache.retain(new Set(edges.map((e) => e.id)));
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
      const source = nodesById.get(e.source);
      const target = nodesById.get(e.target);
      const placement = edgeRoutingMode === 'fixed' ? undefined : optimizedPlacements.get(e.id);
      const highlight = highlightSets ? (highlightSets.edgeIds.has(e.id) ? 'highlighted' : 'dimmed') : 'none';
      const selected = selectedEdgeIds.includes(e.id);
      const loopKind = selectedLoop && highlightSets?.edgeIds.has(e.id) ? selectedLoop.kind : undefined;
      return edgeCache.get(
        e.id,
        [e, source, target, placement, settings, edgeRoutingMode, framework, activeTheme, highlight, selected, loopKind],
        () => buildRFEdge(e, {
          endpoints: [source, target].filter((n): n is DiagramNode => n !== undefined),
          placement, settings, edgeRoutingMode, framework, activeTheme, highlight, selected, loopKind,
        }),
      );
    });
  }, [edgeCache, edges, nodes, settings, edgeRoutingMode, framework, highlightSets, selectedLoop, selectedEdgeIds, activeTheme, optimizedPlacements]);

  return { rfNodes, rfEdges, defaultEdgeOptions, activeTheme };
}
