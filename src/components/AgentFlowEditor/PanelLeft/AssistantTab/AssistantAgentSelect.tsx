import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconRobot } from '@tabler/icons-react';
import { agentsApi } from '../../../../api';

const SEARCH_LIMIT = 20;

interface AssistantAgentSelectProps {
  value: string | null;
  onChange: (agentId: string | null) => void;
  disabled?: boolean;
}

type Option = { value: string; label: string };

// Builder agent picker - searched on the server by name
export function AssistantAgentSelect({ value, onChange, disabled }: AssistantAgentSelectProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Option | null>(null);
  const [loading, setLoading] = useState(false);

  // Label of the selected agent (may not be in the current search results)
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.value === value) return;
    let cancelled = false;
    agentsApi
      .getById(value)
      .then((agent) => !cancelled && setSelected({ value: agent.id, label: agent.name }))
      .catch(() => {
        // Agent deleted or not accessible - clear the stale choice
        if (!cancelled) onChange(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the value changes
  }, [value]);

  useEffect(() => {
    // Search box shows the selected label - don't search for it
    const query = debouncedSearch === selected?.label ? '' : debouncedSearch;
    let cancelled = false;
    setLoading(true);
    agentsApi
      .list({ name: query || undefined, sortBy: 'name', sortOrder: 'asc', limit: SEARCH_LIMIT })
      .then(({ agents }) => !cancelled && setOptions(agents.map((a) => ({ value: a.id, label: a.name }))))
      .catch((err) => console.error('Failed to search agents:', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selected?.label]);

  const data = selected && !options.some((o) => o.value === selected.value) ? [selected, ...options] : options;

  return (
    <Select
      size="xs"
      placeholder="Select builder agent"
      leftSection={<IconRobot size={14} />}
      data={data}
      value={value}
      onChange={(id, option) => {
        setSelected(option ?? null);
        onChange(id);
      }}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      // Results are already filtered by the server
      filter={({ options }) => options}
      nothingFoundMessage={loading ? 'Searching...' : 'No agents found'}
      disabled={disabled}
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
      style={{ flex: 1, minWidth: 0 }}
    />
  );
}
