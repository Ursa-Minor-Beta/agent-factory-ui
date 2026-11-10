import { useMemo, type ComponentProps } from 'react';
import { TextEditorMarkdownRaw } from '../../../TextEditorMarkdown/TextEditorMarkdown';
import { createTemplateMention, createTemplateHighlight } from './templateMention';
import type { NodeMetadata, TemplateRefs } from '../templateUtils';

interface TemplateTextEditorProps extends Omit<ComponentProps<typeof TextEditorMarkdownRaw>, 'customExtensions'> {
  /** @deprecated Use nodes instead */
  nodeIds?: string[];
  nodes?: NodeMetadata[];
  refs?: TemplateRefs;
}

/**
 * Wrapper around TextEditorMarkdownRaw that adds template reference features:
 * - Autocomplete when typing {{
 * - Highlighting of {{node:...}}, {{secret:...}}, {{var:...}} references (red for invalid)
 * - Output suggestions when typing {{node:id.
 */
export function TemplateTextEditor({ nodeIds, nodes, refs, ...props }: TemplateTextEditorProps) {
  const templateExtensions = useMemo(() => {
    // Backward compatibility: convert nodeIds to nodes
    const nodeMetadata: NodeMetadata[] = nodes || (nodeIds ? nodeIds.map(id => ({ id })) : []);

    if (nodeMetadata.length === 0 && !refs?.secrets?.length && !refs?.variables?.length) return [];

    const nodeIdList = nodeMetadata.map(n => n.id);

    return [
      createTemplateMention(nodeMetadata, refs),
      createTemplateHighlight(nodeIdList, refs),
    ];
  }, [nodeIds, nodes, refs]);

  return (
    <TextEditorMarkdownRaw
      customExtensions={templateExtensions}
      {...props}
    />
  );
}
