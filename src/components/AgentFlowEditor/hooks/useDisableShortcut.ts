import { useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { useLatest } from './useLatest';

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

interface UseDisableShortcutOptions {
  nodes: Node[];
  selectedNodeId?: string;
  setNodesDisabled: (nodeIds: string[], disabled?: boolean) => void;
}

// "D" toggles disabled on the selected nodes (multi-select included)
export function useDisableShortcut({ nodes, selectedNodeId, setNodesDisabled }: UseDisableShortcutOptions) {
  const latest = useLatest({ nodes, selectedNodeId, setNodesDisabled });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'd' || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return;
      const { nodes, selectedNodeId, setNodesDisabled } = latest.current;
      const ids = nodes.filter((n) => n.selected).map((n) => n.id);
      if (selectedNodeId && !ids.includes(selectedNodeId)) ids.push(selectedNodeId);
      if (!ids.length) return;
      e.preventDefault();
      setNodesDisabled(ids);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [latest]);
}
