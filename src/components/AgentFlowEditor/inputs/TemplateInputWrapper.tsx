import { useRef, useEffect, useMemo, useState, type RefObject, type ReactNode } from 'react';
import { Box, Text, Combobox, useCombobox, ScrollArea, type FloatingPosition } from '@mantine/core';
import { HighlightedText, findTemplateStart, parseTemplateContext, type NodeMetadata } from './templateUtils';

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
  /** @deprecated Use nodes instead */
  nodeIds?: string[];
  nodes?: NodeMetadata[];
  onChange: (value: string) => void;
  wrapperStyle?: React.CSSProperties;
  highlightStyle?: React.CSSProperties;
  highlightRef?: RefObject<HTMLDivElement | null>;
  dropdownPosition?: FloatingPosition;
  children: (props: InputRenderProps) => ReactNode;
}

export function TemplateInputWrapper({
  value,
  nodeIds,
  nodes,
  onChange,
  wrapperStyle,
  highlightStyle,
  highlightRef: externalHighlightRef,
  dropdownPosition = 'bottom-start',
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

  // Backward compatibility: convert nodeIds to nodes
  const nodeMetadata = useMemo((): NodeMetadata[] => {
    if (nodes) return nodes;
    if (nodeIds) return nodeIds.map(id => ({ id }));
    return [];
  }, [nodes, nodeIds]);

  // Create lookup map for node outputs
  const nodeOutputsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    nodeMetadata.forEach(node => {
      if (node.outputs) {
        map.set(node.id, node.outputs);
      }
    });
    return map;
  }, [nodeMetadata]);

  // Extract just node IDs for backward compatibility
  const nodeIdList = useMemo(() => nodeMetadata.map(n => n.id), [nodeMetadata]);

  // Generate all possible template references (only node.outputs, not bare nodes)
  const allTemplateOptions = useMemo(() => {
    const options: string[] = [];

    nodeMetadata.forEach(node => {
      // Only add node.output combinations
      if (node.outputs && node.outputs.length > 0) {
        node.outputs.forEach(output => {
          options.push(`${node.id}.${output}`);
        });
      }
    });

    // Sort alphabetically
    return options.sort((a, b) => a.localeCompare(b));
  }, [nodeMetadata]);

  // Filter suggestions based on context
  const filteredSuggestions = useMemo(() => {
    if (nodeMetadata.length === 0) return [];

    const context = parseTemplateContext(filterQuery);

    if (!context || context.type === 'node-id') {
      // Show all template options (node IDs and outputs), filtered by query
      const query = context?.query?.toLowerCase() || '';

      if (!query) {
        return allTemplateOptions;
      }

      return allTemplateOptions.filter(option =>
        option.toLowerCase().includes(query)
      );
    }

    // When user has typed a specific node ID with dot, show only that node's outputs
    const outputs = nodeOutputsMap.get(context.nodeId);
    if (!outputs || outputs.length === 0) return [];

    const query = context.query.toLowerCase();
    const filtered = query ? outputs.filter(output => output.toLowerCase().includes(query)) : outputs;

    // Prepend nodeId to each output to maintain full reference format
    return filtered.map(output => `${context.nodeId}.${output}`).sort((a, b) => a.localeCompare(b));
  }, [nodeMetadata, filterQuery, allTemplateOptions, nodeOutputsMap]);

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
  const insertSuggestion = (suggestionValue: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const cursorPos = input.selectionStart || 0;
    const currentValue = input.value;

    const templateInfo = findTemplateStart(currentValue, cursorPos);
    if (!templateInfo) return;

    // The suggestion value is either "nodeId" or "nodeId.output"
    const template = `{{node:${suggestionValue}}}`;

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
  };

  // Check autocomplete with given value and cursor position
  const checkAutocomplete = (currentValue: string, cursorPos: number) => {
    if (nodeMetadata.length === 0) {
      combobox.closeDropdown();
      return;
    }

    const templateInfo = findTemplateStart(currentValue, cursorPos);

    if (templateInfo) {
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

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
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
        <Text size="xs" ff="monospace">{`node:${suggestion}`}</Text>
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
    >
      <Combobox.Target>
        <Box
          pos="relative"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 'var(--mantine-radius-default)',
            ...wrapperStyle,
          }}
        >
          {/* Highlight layer */}
          <Box ref={highlightRef} style={defaultHighlightStyle}>
            <HighlightedText text={highlightValue} nodeIds={nodeIdList} />
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

      <Combobox.Dropdown
        hidden={filteredSuggestions.length === 0}
      >
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {options.length > 0 ? options : <Combobox.Empty>No nodes found</Combobox.Empty>}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
