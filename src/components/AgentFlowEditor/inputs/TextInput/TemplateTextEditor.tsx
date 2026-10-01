import { useMemo, type ComponentProps } from 'react';
import { TextEditorMarkdownRaw } from '../../../TextEditorMarkdown/TextEditorMarkdown';
import { createTemplateMention, createTemplateHighlight } from './templateMention';

interface TemplateTextEditorProps extends Omit<ComponentProps<typeof TextEditorMarkdownRaw>, 'customExtensions'> {
  nodeIds?: string[];
}

/**
 * Wrapper around TextEditorMarkdownRaw that adds template reference features:
 * - Autocomplete when typing {{
 * - Highlighting of {{node: xyz}} references (cyan for valid, red for invalid)
 */
export function TemplateTextEditor({ nodeIds, ...props }: TemplateTextEditorProps) {
  const templateExtensions = useMemo(() => {
    if (!nodeIds || nodeIds.length === 0) return [];
    return [
      createTemplateMention(nodeIds),
      createTemplateHighlight(nodeIds),
    ];
  }, [nodeIds]);

  return (
    <TextEditorMarkdownRaw
      customExtensions={templateExtensions}
      {...props}
    />
  );
}
