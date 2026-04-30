import { memo } from 'react';
import {
  getJunctionState,
  type Framework,
} from '../../../core/framework-types';
import type { NodeDegrees } from '../../../core/graph/derived';
import type { DiagramNode, JunctionType } from '../../../core/types';
import { useDiagramStore } from '../../../store/diagram-store';
import FormField from '../../form/FormField';
import ButtonGroup from '../../form/ButtonGroup';
import { getJunctionSelectionState } from '../../shared/node-selection';

interface Props {
  selectedNodes: DiagramNode[];
  framework: Framework;
  degreesMap: Map<string, NodeDegrees>;
}

function SelectionJunctionEditor({
  selectedNodes,
  framework,
  degreesMap,
}: Props) {
  const updateNodeJunction = useDiagramStore((state) => state.updateNodeJunction);
  const updateNodesJunction = useDiagramStore((state) => state.updateNodesJunction);

  if (selectedNodes.length === 0) return null;

  if (selectedNodes.length === 1) {
    const node = selectedNodes[0];
    const degrees = degreesMap.get(node.id) ?? { indegree: 0, outdegree: 0 };
    const junctionState = getJunctionState(
      framework,
      degrees.indegree,
      node.data.junctionType,
    );

    if (!junctionState) return null;

    return (
      <FormField label={junctionState.isMath ? 'Operator' : 'Junction Logic'}>
        <ButtonGroup
          items={junctionState.options.map((option) => ({
            value: option.id as JunctionType,
            label: option.label,
          }))}
          selected={node.data.junctionType}
          onSelect={(value) => updateNodeJunction(node.id, value)}
        />
        <p className="field-label" style={{ marginTop: '-0.25rem' }}>
          {junctionState.current.description}
        </p>
      </FormField>
    );
  }

  const junction = getJunctionSelectionState(selectedNodes, framework, degreesMap);
  if (!junction.visible) return null;

  return (
    <FormField label={junction.label}>
      <div className="control-row">
        {junction.options.map((option) => (
          <button
            key={option.id}
            className="btn btn-xs"
            style={
              junction.sharedType === option.id
                ? { background: 'var(--accent)', color: 'white' }
                : { background: 'var(--secondary)' }
            }
            title={option.description}
            onClick={() => updateNodesJunction(junction.eligibleIds, option.id as JunctionType)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {junction.partial && (
        <p className="field-label" style={{ marginTop: '-0.25rem' }}>
          Applies to {junction.eligibleIds.length} of {selectedNodes.length} selected
        </p>
      )}
    </FormField>
  );
}

export default memo(SelectionJunctionEditor);
