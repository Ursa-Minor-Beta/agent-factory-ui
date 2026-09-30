import { memo, useMemo } from 'react';
import { TEMPLATE_VAR_REGEX, TEMPLATE_NODE_ID_REGEX } from '../utils/converters';

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
