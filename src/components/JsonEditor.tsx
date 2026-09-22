import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-json';
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
  // External text control (for split view sync)
  text?: string;
  onTextChange?: (text: string) => void;
}

export function JsonEditor({ value, onChange, readOnly = false, height = '100%', label, text, onTextChange }: JsonEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const isControlled = text !== undefined && onTextChange !== undefined;

  // Keep internal string state so edits persist even when JSON is invalid
  const [internalValue, setInternalValue] = useState(() => JSON.stringify(value, null, 2));
  const lastExternalValue = useRef<string>(JSON.stringify(value, null, 2));

  // Sync from prop only when external value actually changes (uncontrolled mode)
  useEffect(() => {
    if (isControlled) return; // Skip if using external text control
    const newExternalValue = JSON.stringify(value, null, 2);
    if (newExternalValue !== lastExternalValue.current) {
      lastExternalValue.current = newExternalValue;
      setInternalValue(newExternalValue);
    }
  }, [value, isControlled]);

  const handleChange = useCallback((newValue: string) => {
    if (isControlled) {
      // Controlled mode: use external text state
      onTextChange?.(newValue);
    } else {
      // Uncontrolled mode: use internal state
      setInternalValue(newValue);
      if (!onChange) return;
      try {
        const parsed = JSON.parse(newValue);
        onChange(parsed, true);
      } catch {
        onChange(newValue, false);
      }
    }
  }, [isControlled, onTextChange, onChange]);

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
          mode="json"
          theme={colorScheme === 'dark' ? 'one_dark' : 'chrome'}
          value={displayValue}
          onChange={handleChange}
          readOnly={readOnly}
          width="100%"
          height="100%"
          fontSize={13}
          showPrintMargin={false}
          showGutter={true}
          highlightActiveLine={true}
          wrapEnabled={true}
          setOptions={{
            useWorker: false,
            showLineNumbers: true,
            tabSize: 2,
            enableBasicAutocompletion: false,
            enableLiveAutocompletion: false,
            foldStyle: 'markbegin',
            wrap: true,
          }}
          editorProps={{ $blockScrolling: true }}
        />
      </Box>
    </Box>
  );
}
