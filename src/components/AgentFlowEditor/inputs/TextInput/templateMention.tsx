import { ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { Box, Text, ScrollArea } from '@mantine/core';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TEMPLATE_VAR_REGEX, TEMPLATE_NODE_ID_REGEX } from '../../utils/converters';
import { parseTemplateContext, type NodeMetadata } from '../templateUtils';

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface MentionListProps {
  items: string[];
  command: (props: { id: string }) => void;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      // Don't capture keys if there are no items
      if (items.length === 0) {
        return false;
      }

      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }), [items.length, selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <Box
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        overflow: 'hidden',
        boxShadow: 'var(--mantine-shadow-md)',
      }}
    >
      <ScrollArea.Autosize mah={200}>
        {items.map((item, index) => (
          <Box
            key={item}
            onClick={() => selectItem(index)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              backgroundColor: index === selectedIndex ? 'var(--mantine-color-default-hover)' : 'transparent',
            }}
          >
            <Text size="xs" ff="monospace">{`node:${item}`}</Text>
          </Box>
        ))}
      </ScrollArea.Autosize>
    </Box>
  );
});

MentionList.displayName = 'MentionList';

// Plugin key for template highlight decorations
const templateHighlightPluginKey = new PluginKey('templateHighlight');

// Create decoration extension for highlighting existing template references
export function createTemplateHighlight(nodeIds: string[]) {
  const nodeIdSet = new Set(nodeIds);

  return Extension.create({
    name: 'templateHighlight',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: templateHighlightPluginKey,
          state: {
            init(_, { doc }) {
              return findTemplateDecorations(doc, nodeIdSet);
            },
            apply(tr, oldState) {
              if (tr.docChanged) {
                return findTemplateDecorations(tr.doc, nodeIdSet);
              }
              return oldState;
            },
          },
          props: {
            decorations(state) {
              return this.getState(state);
            },
          },
        }),
      ];
    },
  });
}

// Find all template references and create decorations
function findTemplateDecorations(doc: any, nodeIdSet: Set<string>): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;

    const text = node.text || '';
    // Reset regex lastIndex for global matching
    const regex = new RegExp(TEMPLATE_VAR_REGEX.source, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;

      // Check if referenced node is valid
      const nodeIdMatch = match[0].match(TEMPLATE_NODE_ID_REGEX);
      const referencedNodeId = nodeIdMatch?.[1]?.trim();
      const isValid = referencedNodeId ? nodeIdSet.has(referencedNodeId) : false;

      decorations.push(
        Decoration.inline(start, end, {
          class: isValid ? 'template-ref-valid' : 'template-ref-invalid',
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

// Plugin key for tracking typing state
const typingStateKey = new PluginKey('typingState');

// Create suggestion extension for template autocomplete
export function createTemplateMention(nodes: NodeMetadata[]) {
  // Track if the last action was typing (not click)
  let lastActionWasTyping = false;

  // Build lookup maps
  const nodeIds = nodes.map(n => n.id);
  const nodeOutputsMap = new Map<string, string[]>();
  nodes.forEach(node => {
    if (node.outputs) {
      nodeOutputsMap.set(node.id, node.outputs);
    }
  });

  // Generate all possible template options (only node.outputs, not bare nodes)
  const allTemplateOptions: string[] = [];
  nodes.forEach(node => {
    // Only add node.output combinations
    if (node.outputs && node.outputs.length > 0) {
      node.outputs.forEach(output => {
        allTemplateOptions.push(`${node.id}.${output}`);
      });
    }
  });
  allTemplateOptions.sort((a, b) => a.localeCompare(b));

  return Extension.create({
    name: 'templateSuggestion',

    addProseMirrorPlugins() {
      const suggestionPlugin = Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      });

      // Plugin to track typing vs clicking
      const typingTracker = new Plugin({
        key: typingStateKey,
        props: {
          handleTextInput() {
            lastActionWasTyping = true;
            return false; // Don't prevent default
          },
          handleClick() {
            lastActionWasTyping = false;
            return false;
          },
          handleDOMEvents: {
            mousedown() {
              lastActionWasTyping = false;
              return false;
            },
          },
        },
      });

      return [typingTracker, suggestionPlugin];
    },

    addOptions() {
      return {
        suggestion: {
          char: '{',
          allowSpaces: true,
          // Only allow suggestion when typing, not clicking
          allow: ({ state, range }: { state: any; range: any }) => {
            // Only show suggestions if the user is typing
            if (!lastActionWasTyping) {
              return false;
            }

            // Also check if we're inside an existing complete template
            const { from } = range;
            const docSize = state.doc.content.size;
            const textAfter = state.doc.textBetween(from, Math.min(from + 100, docSize), '', '');

            const closeIndex = textAfter.indexOf('}}');
            const openIndex = textAfter.indexOf('{{');

            if (closeIndex !== -1 && (openIndex === -1 || closeIndex < openIndex)) {
              return false;
            }
            return true;
          },
          items: ({ query }: { query: string }) => {
            // Only show suggestions if query starts with { (meaning user typed {{)
            if (!query.startsWith('{')) {
              return [];
            }
            // Remove the leading { to get actual query
            const actualQuery = query.slice(1);

            const context = parseTemplateContext(actualQuery);

            if (!context || context.type === 'node-id') {
              // Show all template options, filtered by query
              const q = context?.query?.toLowerCase() || '';

              if (!q) {
                return allTemplateOptions;
              }

              return allTemplateOptions.filter(option => option.toLowerCase().includes(q));
            }

            // When user has typed a specific node ID with dot, show only that node's outputs
            const outputs = nodeOutputsMap.get(context.nodeId);
            if (!outputs || outputs.length === 0) return [];

            const q = context.query.toLowerCase();
            const filtered = q ? outputs.filter(output => output.toLowerCase().includes(q)) : outputs;
            return filtered.sort((a, b) => a.localeCompare(b));
          },
          command: ({ editor, range, props }: { editor: any; range: any; props: { id: string } }) => {
            // The props.id is already in the format "nodeId" or "nodeId.output"
            const template = `{{node:${props.id}}}`;
            editor.chain().focus().deleteRange(range).insertContent(template).run();
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: HTMLElement | null = null;

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                popup = document.createElement('div');
                popup.style.position = 'fixed';
                popup.style.zIndex = '9999';
                document.body.appendChild(popup);
                popup.appendChild(component.element);

                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              },

              onUpdate: (props: SuggestionProps) => {
                component?.updateProps(props);

                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              },

              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === 'Escape') {
                  popup?.remove();
                  component?.destroy();
                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },

              onExit: () => {
                popup?.remove();
                component?.destroy();
              },
            };
          },
        },
      };
    },
  });
}
