import { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { TextInput, Box, Text, Combobox, useCombobox, ScrollArea } from '@mantine/core';
import { TEMPLATE_VAR_REGEX, TEMPLATE_NODE_ID_REGEX } from '../utils/converters';

interface StringInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  nodeIds?: string[];
  onChange: (value: string) => void;
}

interface HighlightedTextProps {
  text: string;
  nodeIds?: string[];
}

const HighlightedText = memo(function HighlightedText({ text, nodeIds }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    return text.split(TEMPLATE_VAR_REGEX);
  }, [text]);

  const nodeIdSet = useMemo(() => new Set(nodeIds || []), [nodeIds]);

  return (
    <>
      {parts.map((part, i) => {
        if (!TEMPLATE_VAR_REGEX.test(part)) {
          return <span key={i}>{part}</span>;
        }

        // Extract node ID and check if it exists
        const match = part.match(TEMPLATE_NODE_ID_REGEX);
        const referencedNodeId = match?.[1]?.trim();
        const isValid = referencedNodeId ? nodeIdSet.has(referencedNodeId) : false;

        return (
          <span
            key={i}
            style={{
              color: 'transparent',
              backgroundColor: isValid
                ? 'rgba(34, 184, 207, 0.15)'  // cyan for valid
                : 'rgba(239, 68, 68, 0.15)',   // red for invalid
              borderRadius: 2,
            }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
});

const DEBOUNCE_MS = 300;

// Find the start of the current template being typed (after {{ )
function findTemplateStart(text: string, cursorPos: number): { start: number; query: string } | null {
  // Look backwards from cursor for {{
  const beforeCursor = text.slice(0, cursorPos);
  const lastOpen = beforeCursor.lastIndexOf('{{');

  if (lastOpen === -1) return null;

  // Check if there's a closing }} between {{ and cursor
  const afterOpen = beforeCursor.slice(lastOpen);
  if (afterOpen.includes('}}')) return null;

  // Get the text after {{ up to cursor
  const query = beforeCursor.slice(lastOpen + 2);
  return { start: lastOpen, query };
}

export const StringInput = memo(function StringInput({ name, value, nodeIds, onChange }: StringInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightValue, setHighlightValue] = useState(value);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string | null>(null);

  // Autocomplete state
  const [filterQuery, setFilterQuery] = useState('');

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // Keep refs updated
  onChangeRef.current = onChange;

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!nodeIds || nodeIds.length === 0) return [];
    const query = filterQuery.toLowerCase().replace(/^node:\s*/, '');
    if (!query) return nodeIds;
    return nodeIds.filter(id => id.toLowerCase().includes(query));
  }, [nodeIds, filterQuery]);

  // Sync only on external value changes (e.g., node switch), not our own emitted changes
  useEffect(() => {
    // If value matches what we last emitted, it's just the parent echoing back - don't overwrite
    if (lastEmittedRef.current === value) {
      return;
    }
    // External change (node switch, etc.) - sync the input
    setHighlightValue(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Insert selected suggestion
  const insertSuggestion = useCallback((nodeId: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart || 0;
    const currentValue = input.value;

    const templateInfo = findTemplateStart(currentValue, cursorPos);
    if (!templateInfo) return;

    // Build the template string
    const template = `{{node: ${nodeId}}}`;

    // Replace from {{ to cursor with the template
    const before = currentValue.slice(0, templateInfo.start);
    const after = currentValue.slice(cursorPos);
    const newValue = before + template + after;

    // Update input value
    input.value = newValue;

    // Position cursor after the template
    const newCursorPos = templateInfo.start + template.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Emit change
    lastEmittedRef.current = newValue;
    onChangeRef.current(newValue);
    setHighlightValue(newValue);

    // Close dropdown
    combobox.closeDropdown();
    setFilterQuery('');
  }, [combobox]);

  // Check for autocomplete trigger on input change
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

  // Debounced onChange
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

  // Update highlight and emit final value immediately on blur
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

  // Handle click on input to check autocomplete
  const handleClick = useCallback(() => {
    checkAutocomplete();
  }, [checkAutocomplete]);

  const options = filteredSuggestions.map((nodeId) => (
    <Combobox.Option value={nodeId} key={nodeId}>
      <Text size="xs" ff="monospace">{nodeId}</Text>
    </Combobox.Option>
  ));

  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
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
            {/* Highlight layer - renders below the input, matches Mantine xs input */}
            <Box
              style={{
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
              }}
            >
              <HighlightedText text={highlightValue} nodeIds={nodeIds} />
            </Box>
            {/* Actual input - transparent text & bg so highlights show through */}
            <TextInput
              ref={inputRef}
              size="xs"
              defaultValue={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  combobox.closeDropdown();
                }
              }}
              styles={{
                input: {
                  backgroundColor: 'transparent',
                },
              }}
            />
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
    </Box>
  );
});
