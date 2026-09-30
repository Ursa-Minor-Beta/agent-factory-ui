import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-one_dark';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

export interface JsonEditorProps {
  value: unknown;
  onChange?: (value: unknown, isValid: boolean) => void;
  readOnly?: boolean;
  height?: string | number;
  label?: string;
  mode?: 'json' | 'javascript';
  showLineNumbers?: boolean;
  fontSize?: number;
  fontFamily?: string;
  // External text control (for split view sync)
  text?: string;
  onTextChange?: (text: string) => void;
}

export function JsonEditor({ value, onChange, readOnly = false, height = '100%', label, mode = 'json', showLineNumbers = true, fontSize = 13, fontFamily = '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', text, onTextChange }: JsonEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const isControlled = text !== undefined && onTextChange !== undefined;

  // For javascript mode, show strings directly without JSON quotes
  const valueToString = useCallback((val: unknown): string => {
    if (mode === 'javascript' && typeof val === 'string') {
      return val;
    }
    return JSON.stringify(val, null, 2);
  }, [mode]);

  // Keep internal string state so edits persist even when JSON is invalid
  const [internalValue, setInternalValue] = useState(() => valueToString(value));
  const lastExternalValue = useRef<string>(valueToString(value));

  // Sync from prop only when external value actually changes (uncontrolled mode)
  useEffect(() => {
    if (isControlled) return; // Skip if using external text control
    const newExternalValue = valueToString(value);
    if (newExternalValue !== lastExternalValue.current) {
      lastExternalValue.current = newExternalValue;
      setInternalValue(newExternalValue);
    }
  }, [value, isControlled, valueToString]);

  const handleChange = useCallback((newValue: string) => {
    if (isControlled) {
      // Controlled mode: use external text state
      onTextChange?.(newValue);
    } else {
      // Uncontrolled mode: use internal state
      setInternalValue(newValue);
      if (!onChange) return;

      // In javascript mode, treat content as raw string (always valid)
      if (mode === 'javascript') {
        onChange(newValue, true);
        return;
      }

      try {
        const parsed = JSON.parse(newValue);
        onChange(parsed, true);
      } catch {
        onChange(newValue, false);
      }
    }
  }, [isControlled, onTextChange, onChange, mode]);

  const displayValue = isControlled ? text : internalValue;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: typeof height === 'number' ? `${height}px` : height }}>
      {label && <Text fw={600} mb="xs">{label}</Text>}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <AceEditor
          mode={mode}
          theme={colorScheme === 'dark' ? 'one_dark' : 'chrome'}
          value={displayValue}
          onChange={handleChange}
          readOnly={readOnly}
          width="100%"
          height="100%"
          fontSize={fontSize}
          showPrintMargin={false}
          showGutter={showLineNumbers}
          highlightActiveLine={!readOnly}
          wrapEnabled={true}
          setOptions={{
            useWorker: false,
            showLineNumbers: showLineNumbers,
            tabSize: 2,
            enableBasicAutocompletion: false,
            enableLiveAutocompletion: false,
            foldStyle: 'markbegin',
            wrap: true,
            fontFamily,
          }}
          editorProps={{ $blockScrolling: true }}
        />
      </Box>
    </Box>
  );
}
