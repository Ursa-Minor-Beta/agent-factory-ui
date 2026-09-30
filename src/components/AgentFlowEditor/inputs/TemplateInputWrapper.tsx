import { useRef, useEffect, useMemo, useState, useCallback, type RefObject, type ReactNode } from 'react';
import { Box, Text, Combobox, useCombobox, ScrollArea } from '@mantine/core';
import { HighlightedText, findTemplateStart } from './templateUtils';

const DEBOUNCE_MS = 300;

interface InputRenderProps {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  defaultValue: string;
  handleChange: () => void;
  handleBlur: () => void;
  handleClick: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

interface TemplateInputWrapperProps {
  value: string;
  nodeIds?: string[];
  onChange: (value: string) => void;
  highlightStyle?: React.CSSProperties;
  highlightRef?: RefObject<HTMLDivElement>;
  children: (props: InputRenderProps) => ReactNode;
}

export function TemplateInputWrapper({
  value,
  nodeIds,
  onChange,
  highlightStyle,
  highlightRef: externalHighlightRef,
  children,
}: TemplateInputWrapperProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const internalHighlightRef = useRef<HTMLDivElement>(null);
  const highlightRef = externalHighlightRef || internalHighlightRef;
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const [highlightValue, setHighlightValue] = useState(value);
  const [filterQuery, setFilterQuery] = useState('');

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  onChangeRef.current = onChange;

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    if (!nodeIds || nodeIds.length === 0) return [];
    const query = filterQuery.toLowerCase().replace(/^node:\s*/, '');
    if (!query) return nodeIds;
    return nodeIds.filter(id => id.toLowerCase().includes(query));
  }, [nodeIds, filterQuery]);

  // Sync on external value changes
  useEffect(() => {
    if (lastEmittedRef.current === value) return;
    setHighlightValue(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Insert suggestion
  const insertSuggestion = useCallback((nodeId: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart || 0;
    const currentValue = input.value;

    const templateInfo = findTemplateStart(currentValue, cursorPos);
    if (!templateInfo) return;

    const template = `{{node: ${nodeId}}}`;
    const before = currentValue.slice(0, templateInfo.start);
    const after = currentValue.slice(cursorPos);
    const newValue = before + template + after;

    input.value = newValue;

    const newCursorPos = templateInfo.start + template.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    lastEmittedRef.current = newValue;
    onChangeRef.current(newValue);
    setHighlightValue(newValue);

    combobox.closeDropdown();
    setFilterQuery('');
  }, [combobox]);

  // Check autocomplete
  const checkAutocomplete = useCallback(() => {
    if (!inputRef.current || !nodeIds || nodeIds.length === 0) {
      combobox.closeDropdown();
      return;
    }

    const cursorPos = inputRef.current.selectionStart || 0;
    const templateInfo = findTemplateStart(inputRef.current.value, cursorPos);

    if (templateInfo) {
      setFilterQuery(templateInfo.query);
      combobox.openDropdown();
      combobox.resetSelectedOption();
    } else {
      combobox.closeDropdown();
      setFilterQuery('');
    }
  }, [nodeIds, combobox]);

  // Debounced change
  const handleChange = useCallback(() => {
    checkAutocomplete();

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (inputRef.current) {
        lastEmittedRef.current = inputRef.current.value;
        onChangeRef.current(inputRef.current.value);
      }
    }, DEBOUNCE_MS);
  }, [checkAutocomplete]);

  // Blur handler
  const handleBlur = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    if (inputRef.current) {
      setHighlightValue(inputRef.current.value);
      lastEmittedRef.current = inputRef.current.value;
      onChangeRef.current(inputRef.current.value);
    }
  }, []);

  // Click handler
  const handleClick = useCallback(() => {
    checkAutocomplete();
  }, [checkAutocomplete]);

  // KeyDown handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      combobox.closeDropdown();
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !combobox.dropdownOpened) {
      e.stopPropagation();
    }
  }, [combobox]);

  const options = filteredSuggestions.map((nodeId) => (
    <Combobox.Option value={nodeId} key={nodeId}>
      <Text size="xs" ff="monospace">{nodeId}</Text>
    </Combobox.Option>
  ));

  const defaultHighlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    padding: '0 12px',
    fontSize: 'var(--mantine-font-size-xs)',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'pre',
    overflow: 'hidden',
    pointerEvents: 'none',
    color: 'transparent',
    ...highlightStyle,
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        insertSuggestion(val);
        inputRef.current?.focus();
      }}
    >
      <Combobox.Target>
        <Box
          pos="relative"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 'var(--mantine-radius-default)',
          }}
        >
          {/* Highlight layer */}
          <Box ref={highlightRef} style={defaultHighlightStyle}>
            <HighlightedText text={highlightValue} nodeIds={nodeIds} />
          </Box>

          {children({
            inputRef: inputRef as RefObject<HTMLInputElement | HTMLTextAreaElement>,
            defaultValue: value,
            handleChange,
            handleBlur,
            handleClick,
            handleKeyDown,
          })}
        </Box>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {options.length > 0 ? options : <Combobox.Empty>No nodes found</Combobox.Empty>}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
