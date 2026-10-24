import { useMemo } from 'react';
import type { DiagramNode } from '../../../core/types';
import { useDiagramStore, useFramework } from '../../../store/diagram-store';
import { useGraphDerivations } from '../../../hooks/useGraphDerivations';
import { nodeDisplayLabel } from '../../../core/text/plain-text';

export function useNodeSelectionDetails(selectedNodes: DiagramNode[]) {
  const framework = useFramework();
  const nodes = useDiagramStore((state) => state.diagram.nodes);
  const edges = useDiagramStore((state) => state.diagram.edges);
  const { degreesMap, labeledLoops } = useGraphDerivations(
    edges,
    framework.allowsCycles,
  );

  const ids = useMemo(
    () => selectedNodes.map((node) => node.id),
    [selectedNodes],
  );
  const nodeLabels = useMemo(
    () => new Map(nodes.map((node) => [node.id, nodeDisplayLabel(node.data.label)])),
    [nodes],
  );

  return {
    framework,
    ids,
    degreesMap,
    labeledLoops,
    nodeLabels,
  };
}
