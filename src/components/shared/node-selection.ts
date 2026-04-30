import {
  getJunctionOptions,
  type Framework,
  type NodeTag,
} from '../../core/framework-types';
import type { NodeDegrees } from '../../core/graph/derived';
import type { DiagramNode, JunctionType } from '../../core/types';
import { colorsMatch } from './color-utils';

export function getNodeIds(nodes: DiagramNode[]) {
  return nodes.map((node) => node.id);
}

export function getSharedNodeColor(
  nodes: DiagramNode[],
  key: 'color' | 'textColor',
): string | undefined {
  if (nodes.length === 0) return undefined;
  const first = nodes[0].data[key];
  return nodes.every((node) => colorsMatch(node.data[key], first)) ? first : undefined;
}

export function getNodeTagStats(selectedNodes: DiagramNode[], availableTags: NodeTag[]) {
  const total = selectedNodes.length;
  return availableTags.map((tag) => {
    const count = selectedNodes.filter((node) => node.data.tags.includes(tag.id)).length;
    return {
      tag,
      count,
      allHave: count === total,
      noneHave: count === 0,
    };
  });
}

export function getJunctionSelectionState(
  selectedNodes: DiagramNode[],
  framework: Framework,
  degreesMap: Map<string, NodeDegrees>,
) {
  const options = getJunctionOptions(framework);
  const isMath = options.some((option) => option.id === 'add' || option.id === 'multiply');
  const minIndegree = isMath ? 1 : 2;
  const eligibleNodes = selectedNodes.filter(
    (node) => (degreesMap.get(node.id)?.indegree ?? 0) >= minIndegree,
  );
  const eligibleIds = eligibleNodes.map((node) => node.id);
  const sharedType = eligibleNodes.length > 0 && eligibleNodes.every(
    (node) => node.data.junctionType === eligibleNodes[0].data.junctionType,
  )
    ? eligibleNodes[0].data.junctionType as JunctionType
    : null;

  return {
    options,
    isMath,
    label: isMath ? 'Operator' : 'Junction Logic',
    eligibleIds,
    sharedType,
    partial: eligibleIds.length < selectedNodes.length,
    visible: options.length > 0 && eligibleIds.length > 0,
  };
}
