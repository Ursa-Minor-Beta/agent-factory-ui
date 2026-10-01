import { memo, useMemo } from 'react';
import { TEMPLATE_VAR_REGEX, TEMPLATE_NODE_ID_REGEX } from '../utils/converters';

export interface NodeMetadata {
  id: string;
  outputs?: string[];
}

interface HighlightedTextProps {
  text: string;
  nodeIds?: string[];
}

export const HighlightedText = memo(function HighlightedText({ text, nodeIds }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    return text.split(TEMPLATE_VAR_REGEX);
  }, [text]);

  const nodeIdSet = useMemo(() => new Set(nodeIds || []), [nodeIds]);

  return (
    <>
      {parts.map((part, i) => {
        if (!TEMPLATE_VAR_REGEX.test(part)) {
          return <span key={i}>{part}</span>;
        }

        const match = part.match(TEMPLATE_NODE_ID_REGEX);
        const referencedNodeId = match?.[1]?.trim();
        const isValid = referencedNodeId ? nodeIdSet.has(referencedNodeId) : false;

        return (
          <span
            key={i}
            style={{
              color: 'transparent',
              backgroundColor: isValid
                ? 'rgba(34, 184, 207, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              borderRadius: 2,
            }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
});

// Template context types
export type TemplateContext =
  | { type: 'node-id'; query: string }  // Typing {{node:...
  | { type: 'output'; nodeId: string; query: string }; // Typing {{node:id.output...

// Find the start of the current template being typed (after {{ )
export function findTemplateStart(text: string, cursorPos: number): { start: number; query: string } | null {
  const beforeCursor = text.slice(0, cursorPos);
  const lastOpen = beforeCursor.lastIndexOf('{{');

  if (lastOpen === -1) return null;

  const afterOpen = beforeCursor.slice(lastOpen);
  if (afterOpen.includes('}}')) return null;

  const query = beforeCursor.slice(lastOpen + 2);
  return { start: lastOpen, query };
}

// Parse template context to determine what to suggest
export function parseTemplateContext(query: string): TemplateContext | null {
  // Remove leading/trailing whitespace
  const trimmed = query.trim();

  // Check if starts with 'node:'
  if (!trimmed.startsWith('node:')) {
    return null;
  }

  // Remove 'node:' prefix
  const afterNode = trimmed.slice(5).trim();

  // Check if there's a dot (suggesting outputs)
  const dotIndex = afterNode.indexOf('.');

  if (dotIndex === -1) {
    // No dot yet, suggesting node IDs
    return { type: 'node-id', query: afterNode };
  }

  // There's a dot, extract node ID and output query
  const nodeId = afterNode.slice(0, dotIndex).trim();
  const outputQuery = afterNode.slice(dotIndex + 1);

  return { type: 'output', nodeId, query: outputQuery };
}
