import { useState, useCallback, useEffect } from 'react';
import { Box, Text, useMantineColorScheme } from '@mantine/core';
import AceEditor from 'react-ace';
import ace from 'ace-builds';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-one_dark';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

// JavaScript built-in completions
const jsBuiltins = [
  // Global objects
  { name: 'Date', meta: 'class' },
  { name: 'Math', meta: 'object' },
  { name: 'JSON', meta: 'object' },
  { name: 'Array', meta: 'class' },
  { name: 'Object', meta: 'class' },
  { name: 'String', meta: 'class' },
  { name: 'Number', meta: 'class' },
  { name: 'Boolean', meta: 'class' },
  { name: 'RegExp', meta: 'class' },
  { name: 'Map', meta: 'class' },
  { name: 'Set', meta: 'class' },
  { name: 'Promise', meta: 'class' },
  { name: 'console', meta: 'object' },
  // Date methods
  { name: 'Date.now', meta: 'method', value: 'Date.now()' },
  { name: 'Date.parse', meta: 'method', value: 'Date.parse()' },
  { name: 'new Date', meta: 'constructor', value: 'new Date()' },
  { name: 'toISOString', meta: 'method', value: 'toISOString()' },
  { name: 'toLocaleDateString', meta: 'method', value: 'toLocaleDateString()' },
  { name: 'toLocaleTimeString', meta: 'method', value: 'toLocaleTimeString()' },
  { name: 'getTime', meta: 'method', value: 'getTime()' },
  { name: 'getFullYear', meta: 'method', value: 'getFullYear()' },
  { name: 'getMonth', meta: 'method', value: 'getMonth()' },
  { name: 'getDate', meta: 'method', value: 'getDate()' },
  { name: 'getHours', meta: 'method', value: 'getHours()' },
  { name: 'getMinutes', meta: 'method', value: 'getMinutes()' },
  { name: 'getSeconds', meta: 'method', value: 'getSeconds()' },
  // Math methods
  { name: 'Math.floor', meta: 'method', value: 'Math.floor()' },
  { name: 'Math.ceil', meta: 'method', value: 'Math.ceil()' },
  { name: 'Math.round', meta: 'method', value: 'Math.round()' },
  { name: 'Math.random', meta: 'method', value: 'Math.random()' },
  { name: 'Math.abs', meta: 'method', value: 'Math.abs()' },
  { name: 'Math.max', meta: 'method', value: 'Math.max()' },
  { name: 'Math.min', meta: 'method', value: 'Math.min()' },
  // JSON methods
  { name: 'JSON.stringify', meta: 'method', value: 'JSON.stringify()' },
  { name: 'JSON.parse', meta: 'method', value: 'JSON.parse()' },
  // Array methods
  { name: 'map', meta: 'method', value: 'map()' },
  { name: 'filter', meta: 'method', value: 'filter()' },
  { name: 'reduce', meta: 'method', value: 'reduce()' },
  { name: 'forEach', meta: 'method', value: 'forEach()' },
  { name: 'find', meta: 'method', value: 'find()' },
  { name: 'findIndex', meta: 'method', value: 'findIndex()' },
  { name: 'includes', meta: 'method', value: 'includes()' },
  { name: 'indexOf', meta: 'method', value: 'indexOf()' },
  { name: 'join', meta: 'method', value: 'join()' },
  { name: 'slice', meta: 'method', value: 'slice()' },
  { name: 'splice', meta: 'method', value: 'splice()' },
  { name: 'push', meta: 'method', value: 'push()' },
  { name: 'pop', meta: 'method', value: 'pop()' },
  { name: 'shift', meta: 'method', value: 'shift()' },
  { name: 'unshift', meta: 'method', value: 'unshift()' },
  { name: 'sort', meta: 'method', value: 'sort()' },
  { name: 'reverse', meta: 'method', value: 'reverse()' },
  { name: 'concat', meta: 'method', value: 'concat()' },
  { name: 'flat', meta: 'method', value: 'flat()' },
  { name: 'flatMap', meta: 'method', value: 'flatMap()' },
  // String methods
  { name: 'toLowerCase', meta: 'method', value: 'toLowerCase()' },
  { name: 'toUpperCase', meta: 'method', value: 'toUpperCase()' },
  { name: 'trim', meta: 'method', value: 'trim()' },
  { name: 'split', meta: 'method', value: 'split()' },
  { name: 'replace', meta: 'method', value: 'replace()' },
  { name: 'replaceAll', meta: 'method', value: 'replaceAll()' },
  { name: 'substring', meta: 'method', value: 'substring()' },
  { name: 'substr', meta: 'method', value: 'substr()' },
  { name: 'charAt', meta: 'method', value: 'charAt()' },
  { name: 'charCodeAt', meta: 'method', value: 'charCodeAt()' },
  { name: 'startsWith', meta: 'method', value: 'startsWith()' },
  { name: 'endsWith', meta: 'method', value: 'endsWith()' },
  { name: 'padStart', meta: 'method', value: 'padStart()' },
  { name: 'padEnd', meta: 'method', value: 'padEnd()' },
  { name: 'repeat', meta: 'method', value: 'repeat()' },
  // Object methods
  { name: 'Object.keys', meta: 'method', value: 'Object.keys()' },
  { name: 'Object.values', meta: 'method', value: 'Object.values()' },
  { name: 'Object.entries', meta: 'method', value: 'Object.entries()' },
  { name: 'Object.assign', meta: 'method', value: 'Object.assign()' },
  { name: 'Object.fromEntries', meta: 'method', value: 'Object.fromEntries()' },
  { name: 'hasOwnProperty', meta: 'method', value: 'hasOwnProperty()' },
  // Console methods
  { name: 'console.log', meta: 'method', value: 'console.log()' },
  { name: 'console.error', meta: 'method', value: 'console.error()' },
  { name: 'console.warn', meta: 'method', value: 'console.warn()' },
  // Keywords
  { name: 'const', meta: 'keyword' },
  { name: 'let', meta: 'keyword' },
  { name: 'var', meta: 'keyword' },
  { name: 'function', meta: 'keyword' },
  { name: 'return', meta: 'keyword' },
  { name: 'if', meta: 'keyword' },
  { name: 'else', meta: 'keyword' },
  { name: 'for', meta: 'keyword' },
  { name: 'while', meta: 'keyword' },
  { name: 'true', meta: 'keyword' },
  { name: 'false', meta: 'keyword' },
  { name: 'null', meta: 'keyword' },
  { name: 'undefined', meta: 'keyword' },
  { name: 'typeof', meta: 'keyword' },
  { name: 'instanceof', meta: 'keyword' },
  { name: 'async', meta: 'keyword' },
  { name: 'await', meta: 'keyword' },
];

const jsCompleter = {
  getCompletions: (
    _editor: unknown,
    _session: unknown,
    _pos: unknown,
    prefix: string,
    callback: (err: null, completions: Array<{ caption: string; value: string; meta: string; score: number }>) => void
  ) => {
    const completions = jsBuiltins
      .filter((item) => item.name.toLowerCase().includes(prefix.toLowerCase()))
      .map((item) => ({
        caption: item.name,
        value: item.value || item.name,
        meta: item.meta,
        score: 1000,
      }));
    callback(null, completions);
  },
};

// Register the completer once
let completerRegistered = false;

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

export function JsonEditor({ value, onChange, readOnly = false, height = '100%', label, mode = 'json', showLineNumbers = true, fontSize = 13, fontFamily = '"Monaco", "Menlo", "Consolas", "Courier New", monospace', text, onTextChange }: JsonEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const isControlled = text !== undefined && onTextChange !== undefined;

  // Register JavaScript completer once
  useEffect(() => {
    if (!completerRegistered && mode === 'javascript') {
      const langTools = ace.require('ace/ext/language_tools');
      langTools.addCompleter(jsCompleter);
      completerRegistered = true;
    }
  }, [mode]);

  // For javascript mode, show strings directly without JSON quotes
  const valueToString = useCallback((val: unknown): string => {
    if (mode === 'javascript' && typeof val === 'string') {
      return val;
    }
    return JSON.stringify(val, null, 2);
  }, [mode]);

  // Keep internal string state so edits persist even when JSON is invalid
  const [internalValue, setInternalValue] = useState(() => valueToString(value));
  const [isValid, setIsValid] = useState(true);

  const handleChange = useCallback((newValue: string) => {
    if (isControlled) {
      // Controlled mode: use external text state
      onTextChange?.(newValue);
    } else {
      // Uncontrolled mode: use internal state
      setInternalValue(newValue);
      if (!onChange) return;

      // In javascript mode, try to parse as JSON first, fall back to raw string
      if (mode === 'javascript') {
        const trimmed = newValue.trim();
        const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

        try {
          const parsed = JSON.parse(newValue);
          setIsValid(true);
          onChange(parsed, true);
        } catch {
          // If it looks like JSON but failed to parse, report as invalid
          const valid = !looksLikeJson;
          setIsValid(valid);
          onChange(newValue, valid);
        }
        return;
      }

      try {
        const parsed = JSON.parse(newValue);
        setIsValid(true);
        onChange(parsed, true);
      } catch {
        setIsValid(false);
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
          border: `1px solid ${isValid ? 'var(--mantine-color-default-border)' : 'var(--mantine-color-red-6)'}`,
          position: 'relative',
        }}
      >
        {!isValid && (
          <Text
            size="xs"
            c="white"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 10,
              backgroundColor: 'var(--mantine-color-red-6)',
              padding: '2px 8px',
              borderBottomRightRadius: 4,
            }}
          >
            Invalid JSON
          </Text>
        )}
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
            enableBasicAutocompletion: mode === 'javascript',
            enableLiveAutocompletion: mode === 'javascript',
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
