import { useEffect, useRef, useCallback } from 'react';
import { Box, Text } from '@mantine/core';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, insertNewlineAndIndent } from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, bracketMatching, indentOnInput } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

export interface JsonEditorProps {
  value: unknown;
  onChange?: (value: unknown, isValid: boolean) => void;
  readOnly?: boolean;
  height?: string | number;
  label?: string;
}

export function JsonEditor({ value, onChange, readOnly = false, height = '100%', label }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalUpdate = useRef(false);

  const handleChange = useCallback((newValue: string) => {
    if (!onChange || isInternalUpdate.current) return;

    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed, true);
    } catch {
      onChange(newValue, false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialDoc = JSON.stringify(value, null, 2);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isInternalUpdate.current) {
        handleChange(update.state.doc.toString());
      }
    });

    // Prevent Modal from intercepting editor events
    const eventHandlers = EditorView.domEventHandlers({
      keydown: (e) => { e.stopPropagation(); },
      keyup: (e) => { e.stopPropagation(); },
      paste: (e) => { e.stopPropagation(); },
      cut: (e) => { e.stopPropagation(); },
      copy: (e) => { e.stopPropagation(); },
    });

    const extensions = [
      eventHandlers,
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      json(),
      linter(jsonParseLinter()),
      lintGutter(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      keymap.of([
        { key: 'Enter', run: insertNewlineAndIndent },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      updateListener,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        },
        '.cm-content': {
          caretColor: 'var(--mantine-color-cyan-5)',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--mantine-color-dark-8)',
          borderRight: '1px solid var(--mantine-color-dark-5)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--mantine-color-dark-6)',
        },
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: initialDoc,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update content when value prop changes externally
  useEffect(() => {
    if (!viewRef.current) return;

    const newDoc = JSON.stringify(value, null, 2);
    const currentDoc = viewRef.current.state.doc.toString();

    if (newDoc !== currentDoc) {
      isInternalUpdate.current = true;
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: newDoc,
        },
      });
      isInternalUpdate.current = false;
    }
  }, [value]);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: typeof height === 'number' ? height : height }}>
      {label && <Text fw={600} mb="xs">{label}</Text>}
      <Box
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: 'var(--mantine-color-dark-7)',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-dark-5)',
        }}
      />
    </Box>
  );
}
