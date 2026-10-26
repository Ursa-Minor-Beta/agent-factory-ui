import { useCallback, useEffect, useRef, type MouseEvent, type RefObject } from 'react';
import type { Node, ReactFlowInstance } from '@xyflow/react';

// Marker to recognize our node payload in the system clipboard
const CLIPBOARD_NODE_KIND = 'agent-factory/node';

type ClipboardNode = {
  kind: typeof CLIPBOARD_NODE_KIND;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};

function parseClipboardNode(text: string): ClipboardNode | null {
  try {
    const parsed = JSON.parse(text);
    return parsed?.kind === CLIPBOARD_NODE_KIND && typeof parsed.type === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

interface UseNodeClipboardOptions {
  selectedNode: Node | null | undefined;
  reactFlowInstance: RefObject<ReactFlowInstance | null>;
  addNode: (type: string, position?: { x: number; y: number }, data?: Record<string, unknown>) => void;
}

/**
 * Copy / paste node (Ctrl/Cmd + C / V) via the system clipboard.
 * Uses native copy/paste events (works across tabs/windows, no permission prompt).
 * Paste lands at the cursor position - spread returned mouse handlers onto the canvas wrapper.
 */
export function useNodeClipboard({ selectedNode, reactFlowInstance, addNode }: UseNodeClipboardOptions) {
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || !selectedNode?.type || !e.clipboardData) return;
      // Don't hijack copy when user has selected text
      if (window.getSelection()?.toString()) return;

      const payload: ClipboardNode = {
        kind: CLIPBOARD_NODE_KIND,
        type: selectedNode.type,
        data: selectedNode.data as Record<string, unknown>,
        position: selectedNode.position,
      };
      e.clipboardData.setData('text/plain', JSON.stringify(payload));
      e.preventDefault();
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const copied = parseClipboardNode(e.clipboardData?.getData('text/plain') ?? '');
      if (!copied) return;

      e.preventDefault();
      const instance = reactFlowInstance.current;
      const position = instance && lastMousePos.current
        ? instance.screenToFlowPosition(lastMousePos.current)
        : { x: copied.position.x + 40, y: copied.position.y + 40 };
      addNode(copied.type, position, copied.data);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedNode, reactFlowInstance, addNode]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseLeave = useCallback(() => {
    lastMousePos.current = null;
  }, []);

  return { onMouseMove, onMouseLeave };
}
