import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import type { Framework } from '../core/framework-types';
import { getDerivedIndicators, type NodeDegrees } from '../core/graph/derived';

/**
 * Minimap node color: custom color, then first tag color, then first derived
 * indicator, then the theme fallback. Kept referentially stable so the minimap
 * only redraws nodes that actually changed (e.g. the one being dragged).
 */
export function useMinimapNodeColor(
  framework: Framework,
  degreesMap: Map<string, NodeDegrees>,
  fallback: string,
): (node: Node) => string {
  return useCallback((node: Node) => {
    const data = node.data as { tags?: string[]; color?: string };
    if (data?.color) return data.color;
    const tagColor = data?.tags
      ?.map((t) => framework.nodeTags.find((nt) => nt.id === t))
      .find(Boolean)?.color;
    if (tagColor) return tagColor;
    const derived = getDerivedIndicators(node.id, degreesMap, framework.derivedIndicators);
    if (derived.length > 0) return derived[0].color;
    return fallback;
  }, [framework, degreesMap, fallback]);
}
