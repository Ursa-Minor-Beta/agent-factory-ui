import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-one_dark';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';

export interface JsonEditorProps {
  value: unknown;
  onChange?: (value: unknown, isValid: boolean) => void;
  readOnly?: boolean;
  height?: string | number;
  label?: string;
}

export function JsonEditor({ value, onChange, readOnly = false, height = '100%', label }: JsonEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  // Keep internal string state so edits persist even when JSON is invalid
  const [internalValue, setInternalValue] = useState(() => JSON.stringify(value, null, 2));
  const lastExternalValue = useRef<string>(JSON.stringify(value, null, 2));

  // Sync from prop only when external value actually changes
  useEffect(() => {
    const newExternalValue = JSON.stringify(value, null, 2);
    if (newExternalValue !== lastExternalValue.current) {
      lastExternalValue.current = newExternalValue;
      setInternalValue(newExternalValue);
    }
  }, [value]);

  const handleChange = useCallback((newValue: string) => {
    setInternalValue(newValue);

    if (!onChange) return;

    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed, true);
    } catch {
      onChange(newValue, false);
    }
  }, [onChange]);

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
          value={internalValue}
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
