import { useRef, useEffect, useMemo, useState, type RefObject, type ReactNode } from 'react';
import { Box, Text, Combobox, useCombobox, ScrollArea, type FloatingPosition } from '@mantine/core';
import {
  HighlightedText,
  findTemplateStart,
  getCaretCoordinates,
  buildTemplateOptions,
  buildTemplateValidation,
  filterTemplateOptions,
  isTemplateKindOption,
  type NodeMetadata,
  type TemplateRefs,
} from './templateUtils';

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
  nodes?: NodeMetadata[];
  refs?: TemplateRefs;
  onChange: (value: string) => void;
  wrapperStyle?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
  highlightRef?: RefObject<HTMLDivElement | null>;
  dropdownPosition?: FloatingPosition;
  children: (props: InputRenderProps) => ReactNode;
}

export function TemplateInputWrapper({
  value,
  nodes,
  refs,
  onChange,
  wrapperStyle,
  highlightStyle,
  highlightRef: externalHighlightRef,
  dropdownPosition = 'bottom-start',
  children,
}: TemplateInputWrapperProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const internalHighlightRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Dropdown anchor at the caret, relative to the wrapper
  const [caret, setCaret] = useState({ top: 0, left: 0, height: 0 });
  const highlightRef = externalHighlightRef || internalHighlightRef;
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const [highlightValue, setHighlightValue] = useState(value);
  const [filterQuery, setFilterQuery] = useState('');
  // Select the first option once the list re-renders after picking a kind shortcut
  const selectFirstRef = useRef(false);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  onChangeRef.current = onChange;

  // All reference options ("node:id.output", "secret:NAME", "var:NAME")
  const allTemplateOptions = useMemo(() => buildTemplateOptions(nodes, refs), [nodes, refs]);

  const validation = useMemo(
    () => buildTemplateValidation(nodes?.map(n => n.id), refs),
    [nodes, refs]
  );

  const filteredSuggestions = useMemo(
    () => filterTemplateOptions(allTemplateOptions, filterQuery),
    [allTemplateOptions, filterQuery]
  );

  useEffect(() => {
    if (!selectFirstRef.current) return;
    selectFirstRef.current = false;
    combobox.selectFirstOption();
  }, [filteredSuggestions, combobox]);

  // Sync on external value changes
  useEffect(() => {
    // Skip only the echo of our own emit; clear it so a later identical value (e.g. switching back to this node) still syncs
    if (lastEmittedRef.current === value) {
      lastEmittedRef.current = null;
      return;
    }
    setHighlightValue(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Flush pending debounced change on unmount (e.g. switching nodes)
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        if (pendingValueRef.current !== null) onChangeRef.current(pendingValueRef.current);
      }
    };
  }, []);

  // Insert suggestion
  const insertSuggestion = (suggestionValue: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart || 0;
    const currentValue = input.value;

    const templateInfo = findTemplateStart(currentValue, cursorPos);
    if (!templateInfo) return;

    // The suggestion value is the full reference, e.g. "node:id.output" or "secret:NAME",
    // or a kind shortcut ("node:") which only inserts the prefix and keeps suggesting
    const isKind = isTemplateKindOption(suggestionValue);
    const template = isKind ? `{{${suggestionValue}` : `{{${suggestionValue}}}`;

    const before = currentValue.slice(0, templateInfo.start);
    const after = currentValue.slice(cursorPos);
    const newValue = before + template + after;

    input.value = newValue;

    const newCursorPos = templateInfo.start + template.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    lastEmittedRef.current = newValue;
    onChangeRef.current(newValue);
    setHighlightValue(newValue);

    if (isKind) {
      setFilterQuery(suggestionValue);
      selectFirstRef.current = true;
      return;
    }

    combobox.closeDropdown();
    setFilterQuery('');
  };

  // Move the dropdown anchor to the caret; single-line inputs keep it under the field
  const updateCaret = (cursorPos: number) => {
    const input = inputRef.current;
    const wrapper = wrapperRef.current;
    if (!input || !wrapper) return;

    const inputRect = input.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const coords = getCaretCoordinates(input, cursorPos);
    const offsetTop = inputRect.top - wrapperRect.top;
    const isInput = input.tagName === 'INPUT';

    setCaret({
      top: isInput ? offsetTop : offsetTop + Math.max(0, Math.min(coords.top, inputRect.height - coords.height)),
      left: inputRect.left - wrapperRect.left + Math.max(0, Math.min(coords.left, inputRect.width)),
      height: isInput ? inputRect.height : coords.height,
    });
  };

  // Check autocomplete with given value and cursor position
  const checkAutocomplete = (currentValue: string, cursorPos: number) => {
    if (allTemplateOptions.length === 0) {
      combobox.closeDropdown();
      return;
    }

    const templateInfo = findTemplateStart(currentValue, cursorPos);

    if (templateInfo) {
      updateCaret(cursorPos);
      setFilterQuery(templateInfo.query);
      combobox.openDropdown();
      combobox.resetSelectedOption();
    }
    else {
      combobox.closeDropdown();
      setFilterQuery('');
    }
  };

  // Debounced change - update highlight immediately, debounce onChange callback
  const handleChange = () => {
    if (!inputRef.current) return;

    const currentValue = inputRef.current.value;

    const cursorPos = inputRef.current.selectionStart || currentValue.length;

    setHighlightValue(currentValue);
    checkAutocomplete(currentValue, cursorPos);
    pendingValueRef.current = currentValue;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      if (inputRef.current) {
        lastEmittedRef.current = inputRef.current.value;
        onChangeRef.current(inputRef.current.value);
      }
    }, DEBOUNCE_MS);
  };

  // Blur handler
  const handleBlur = () => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (inputRef.current) {
      setHighlightValue(inputRef.current.value);
      lastEmittedRef.current = inputRef.current.value;
      onChangeRef.current(inputRef.current.value);
    }
  };

  // Click handler
  const handleClick = () => {
    if (!inputRef.current) return;
    const currentValue = inputRef.current.value;
    const cursorPos = inputRef.current.selectionStart || currentValue.length;
    checkAutocomplete(currentValue, cursorPos);
  };

  // KeyDown handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      combobox.closeDropdown();
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !combobox.dropdownOpened) {
      e.stopPropagation();
    }
  };

  // Render options
  const options = filteredSuggestions.map((suggestion) => {
    return (
      <Combobox.Option value={suggestion} key={suggestion}>
        <Text size="xs" ff="monospace">{suggestion}</Text>
      </Combobox.Option>
    );
  });

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
      position={dropdownPosition}
      // Anchor is a 1px caret marker - size the dropdown to its options instead
      width="max-content"
    >
      <Combobox.EventsTarget>
        <Box
          ref={wrapperRef}
          pos="relative"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 'var(--mantine-radius-default)',
            ...wrapperStyle,
          }}
        >
          {/* Dropdown anchor following the caret */}
          <Combobox.DropdownTarget>
            <Box
              style={{
                position: 'absolute',
                top: caret.top,
                left: caret.left,
                width: 1,
                height: caret.height,
                pointerEvents: 'none',
              }}
            />
          </Combobox.DropdownTarget>

          {/* Highlight layer */}
          <Box ref={highlightRef} style={defaultHighlightStyle}>
            <HighlightedText text={highlightValue} validation={validation} />
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
      </Combobox.EventsTarget>

      <Combobox.Dropdown
        hidden={filteredSuggestions.length === 0}
        miw={200}
        maw={400}
      >
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {options.length > 0 ? options : <Combobox.Empty>No references found</Combobox.Empty>}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
