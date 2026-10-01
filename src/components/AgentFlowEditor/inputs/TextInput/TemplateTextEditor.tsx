import { useMemo, type ComponentProps } from 'react';
import { TextEditorMarkdownRaw } from '../../../TextEditorMarkdown/TextEditorMarkdown';
import { createTemplateMention, createTemplateHighlight } from './templateMention';
import type { NodeMetadata } from '../templateUtils';

interface TemplateTextEditorProps extends Omit<ComponentProps<typeof TextEditorMarkdownRaw>, 'customExtensions'> {
  /** @deprecated Use nodes instead */
  nodeIds?: string[];
  nodes?: NodeMetadata[];
}

/**
 * Wrapper around TextEditorMarkdownRaw that adds template reference features:
 * - Autocomplete when typing {{
 * - Highlighting of {{node: xyz}} references (cyan for valid, red for invalid)
 * - Output suggestions when typing {{node:id.
 */
export function TemplateTextEditor({ nodeIds, nodes, ...props }: TemplateTextEditorProps) {
  const templateExtensions = useMemo(() => {
    // Backward compatibility: convert nodeIds to nodes
    const nodeMetadata: NodeMetadata[] = nodes || (nodeIds ? nodeIds.map(id => ({ id })) : []);

    if (nodeMetadata.length === 0) return [];

    const nodeIdList = nodeMetadata.map(n => n.id);

    return [
      createTemplateMention(nodeMetadata),
      createTemplateHighlight(nodeIdList),
    ];
  }, [nodeIds, nodes]);

  return (
    <TextEditorMarkdownRaw
      customExtensions={templateExtensions}
      {...props}
    />
  );
}
