import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeMouseHandler } from '@xyflow/react';
import { DOUBLE_CLICK_MS } from '../constants';

type UseEdgeHighlightOptions = {
  onNodeClick: NodeMouseHandler;
  onPaneClick: () => void;
};

// Double-clicked nodes (cmd/ctrl adds to the set): their outgoing edges are highlighted
export function useEdgeHighlight({ onNodeClick, onPaneClick }: UseEdgeHighlightOptions) {
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(() => new Set());
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleNodeClick = useCallback<NodeMouseHandler>((event, node) => {
    // Defer so a double-click (highlight edges) doesn't open the right panel
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (event.detail > 1) return;
    clickTimer.current = setTimeout(() => onNodeClick(event, node), DOUBLE_CLICK_MS);
  }, [onNodeClick]);

  const handleNodeDoubleClick = useCallback<NodeMouseHandler>((event, node) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    const additive = event.metaKey || event.ctrlKey;
    setHighlightedNodeIds((prev) => {
      const isOn = prev.has(node.id);
      const next = new Set(additive ? prev : []);
      if (isOn && (additive || prev.size === 1)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setHighlightedNodeIds(new Set());
    onPaneClick();
  }, [onPaneClick]);

  useEffect(() => () => clearTimeout(clickTimer.current), []);

  return { highlightedNodeIds, handleNodeClick, handleNodeDoubleClick, handlePaneClick };
}
