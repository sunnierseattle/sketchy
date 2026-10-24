import { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { mergeRFEdgesWithLocalState, mergeRFNodesWithLocalState } from './local-node-state';

interface UseReactFlowLocalStateOptions {
  rfNodes: Node[];
  rfEdges: Edge[];
}

export function useReactFlowLocalState({
  rfNodes,
  rfEdges,
}: UseReactFlowLocalStateOptions) {
  const [localNodes, setLocalNodes] = useState<Node[]>(rfNodes);
  const [localEdges, setLocalEdges] = useState<Edge[]>(rfEdges);
  const latestRFNodeIdsRef = useRef<string[]>([]);

  useEffect(() => {
    latestRFNodeIdsRef.current = rfNodes.map((node) => node.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalNodes((prev) => mergeRFNodesWithLocalState(prev, rfNodes));
  }, [rfNodes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalEdges((prev) => mergeRFEdgesWithLocalState(prev, rfEdges));
  }, [rfEdges]);

  return {
    localNodes,
    setLocalNodes,
    localEdges,
    setLocalEdges,
    latestRFNodeIdsRef,
  };
}
