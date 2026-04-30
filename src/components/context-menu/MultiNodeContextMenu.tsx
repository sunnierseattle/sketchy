import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import type { Framework } from '../../core/framework-types';
import type { DiagramNode, JunctionType } from '../../core/types';
import type { NodeDegrees } from '../../core/graph/derived';
import { useDiagramStore } from '../../store/diagram-store';
import type { DiagramSnapshot } from '../../store/diagram-store-types';
import { rememberRecentColor } from '../../store/color-history-store';
import ColorPickerSection from '../shared/ColorPickerSection';
import {
  getJunctionSelectionState,
  getNodeIds,
  getNodeTagStats,
  getSharedNodeColor,
} from '../shared/node-selection';

interface Props {
  selectedNodes: DiagramNode[];
  framework: Framework;
  degreesMap: Map<string, NodeDegrees>;
  closeContextMenu: () => void;
  beginColorPickerInteraction: () => void;
  endColorPickerInteraction: () => void;
  registerCloseActions: (actions: { apply: () => void; cancel: () => void } | null) => void;
}

export default function MultiNodeContextMenu({
  selectedNodes,
  framework,
  degreesMap,
  closeContextMenu,
  beginColorPickerInteraction,
  endColorPickerInteraction,
  registerCloseActions,
}: Props) {
  const addNodesTag = useDiagramStore((s) => s.addNodesTag);
  const removeNodesTag = useDiagramStore((s) => s.removeNodesTag);
  const updateNodesJunction = useDiagramStore((s) => s.updateNodesJunction);
  const previewNodeColor = useDiagramStore((s) => s.previewNodeColor);
  const previewNodeTextColor = useDiagramStore((s) => s.previewNodeTextColor);
  const previewNodesColor = useDiagramStore((s) => s.previewNodesColor);
  const previewNodesTextColor = useDiagramStore((s) => s.previewNodesTextColor);
  const pushHistoryEntry = useDiagramStore((s) => s.pushHistoryEntry);
  const toggleNodeLocked = useDiagramStore((s) => s.toggleNodeLocked);
  const deleteNodes = useDiagramStore((s) => s.deleteNodes);

  const ids = useMemo(() => getNodeIds(selectedNodes), [selectedNodes]);

  const originalsRef = useRef(
    new Map(selectedNodes.map((n) => [n.id, {
      color: n.data.color,
      textColor: n.data.textColor,
    }])),
  );
  // Snapshot the pre-preview diagram so a single undo can restore it after the
  // user commits a color change made via interactive preview swatches.
  const preStateRef = useRef<DiagramSnapshot | null>(null);
  const bgDirtyRef = useRef(false);
  const textDirtyRef = useRef(false);

  const currentBg = getSharedNodeColor(selectedNodes, 'color');
  const currentText = getSharedNodeColor(selectedNodes, 'textColor');

  const captureSnapshotOnce = useCallback(() => {
    if (preStateRef.current) return;
    const diagram = useDiagramStore.getState().diagram;
    preStateRef.current = {
      nodes: diagram.nodes,
      edges: diagram.edges,
      annotations: diagram.annotations,
    };
  }, []);

  const setBackgroundColor = useCallback((color: string | undefined) => {
    captureSnapshotOnce();
    bgDirtyRef.current = true;
    previewNodesColor(ids, color);
  }, [captureSnapshotOnce, ids, previewNodesColor]);

  const setTextColor = useCallback((color: string | undefined) => {
    captureSnapshotOnce();
    textDirtyRef.current = true;
    previewNodesTextColor(ids, color);
  }, [captureSnapshotOnce, ids, previewNodesTextColor]);

  const commitColors = useCallback(() => {
    const dirty = bgDirtyRef.current || textDirtyRef.current;
    if (!dirty || !preStateRef.current) return;
    pushHistoryEntry(preStateRef.current);
    if (bgDirtyRef.current) rememberRecentColor('background', currentBg);
    if (textDirtyRef.current) rememberRecentColor('text', currentText);
    preStateRef.current = null;
    bgDirtyRef.current = false;
    textDirtyRef.current = false;
  }, [currentBg, currentText, pushHistoryEntry]);

  const revertColors = useCallback(() => {
    originalsRef.current.forEach(({ color, textColor }, id) => {
      if (bgDirtyRef.current) previewNodeColor(id, color);
      if (textDirtyRef.current) previewNodeTextColor(id, textColor);
    });
    preStateRef.current = null;
    bgDirtyRef.current = false;
    textDirtyRef.current = false;
  }, [previewNodeColor, previewNodeTextColor]);

  useEffect(() => {
    registerCloseActions({
      apply: () => { commitColors(); closeContextMenu(); },
      cancel: () => { revertColors(); closeContextMenu(); },
    });
    return () => { registerCloseActions(null); };
  }, [closeContextMenu, registerCloseActions, commitColors, revertColors]);

  const applyAndClose = useCallback(() => {
    commitColors();
    closeContextMenu();
  }, [commitColors, closeContextMenu]);

  const total = selectedNodes.length;
  const allLocked = selectedNodes.every((n) => n.data.locked);
  const tagStats = getNodeTagStats(selectedNodes, framework.nodeTags);
  const junction = getJunctionSelectionState(selectedNodes, framework, degreesMap);

  return (
    <>
      <div className="context-menu-label">{total} nodes selected</div>

      {framework.nodeTags.length > 0 && (
        <>
          {tagStats.map(({ tag, count, allHave, noneHave }) => {
            return (
              <div key={tag.id} className="context-menu-multi-row">
                <span className="tag-chip-dot" style={{ backgroundColor: tag.color }} />
                <span style={{ flex: 1 }}>{tag.name}</span>
                <span className="field-label" style={{ marginRight: '0.5rem' }}>
                  {count}/{total}
                </span>
                <button
                  className="btn btn-secondary btn-xs"
                  disabled={allHave}
                  onClick={() => { addNodesTag(ids, tag.id); applyAndClose(); }}
                  aria-label={`Add ${tag.name} to all selected`}
                >
                  Add
                </button>
                <button
                  className="btn btn-secondary btn-xs"
                  disabled={noneHave}
                  onClick={() => { removeNodesTag(ids, tag.id); applyAndClose(); }}
                  aria-label={`Remove ${tag.name} from all selected`}
                >
                  Remove
                </button>
              </div>
            );
          })}
          <div className="context-menu-separator" />
        </>
      )}

      <ColorPickerSection
        label="Background"
        pickerAriaLabel="Custom background color for all selected nodes"
        currentColor={currentBg}
        fallbackInputColor="#F5F5EC"
        onColorChange={setBackgroundColor}
        onPickerFocus={beginColorPickerInteraction}
        onPickerBlur={endColorPickerInteraction}
      />

      <ColorPickerSection
        label="Text Color"
        pickerAriaLabel="Custom text color for all selected nodes"
        currentColor={currentText}
        fallbackInputColor="#1A1A1A"
        onColorChange={setTextColor}
        onPickerFocus={beginColorPickerInteraction}
        onPickerBlur={endColorPickerInteraction}
      />

      {junction.visible && (
        <>
          <div className="context-menu-separator" />
          <div className="context-menu-label">
            {junction.label}
          </div>
          <div className="context-menu-multi-row">
            {junction.options.map((o) => (
              <button
                key={o.id}
                className="btn btn-secondary btn-xs"
                style={{ flex: 1 }}
                title={o.description}
                onClick={() => {
                  updateNodesJunction(junction.eligibleIds, o.id as JunctionType);
                  applyAndClose();
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          {junction.partial && (
            <p className="field-label" style={{ padding: '0 0.75rem 0.25rem' }}>
              Applies to {junction.eligibleIds.length} of {total} selected
            </p>
          )}
        </>
      )}

      <div className="context-menu-separator" />
      <button
        className="context-menu-item"
        onClick={() => {
          toggleNodeLocked(ids, !allLocked);
          applyAndClose();
        }}
      >
        {allLocked ? <Lock size={14} /> : <Unlock size={14} />}
        {allLocked ? 'Unlock All' : 'Lock All'}
      </button>
      <button
        className="context-menu-item context-menu-item--danger"
        onClick={() => {
          deleteNodes(ids);
          closeContextMenu();
        }}
      >
        <Trash2 size={14} />
        Delete All
      </button>
    </>
  );
}
