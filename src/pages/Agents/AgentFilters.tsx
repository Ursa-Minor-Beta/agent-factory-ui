import { Card, Group, TextInput, Select, Button, Box } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { AgentFiltersProps } from './types';

export function AgentFilters({
  descriptionFilter,
  onDescriptionChange,
  createdAfter,
  onCreatedAfterChange,
  createdBefore,
  onCreatedBeforeChange,
  isSystemFilter,
  onIsSystemChange,
  isAdmin,
  activeFilterCount,
  onClearFilters,
}: AgentFiltersProps) {
  return (
    <Card mb="md" p="md" withBorder>
      <Group gap="sm" wrap="wrap" align="flex-end">
        <TextInput
          label="Description"
          placeholder="Filter by description..."
          value={descriptionFilter}
          onChange={(e) => onDescriptionChange(e.currentTarget.value)}
          style={{ minWidth: 200 }}
        />
        <TextInput
          label="Created after"
          type="date"
          value={createdAfter}
          onChange={(e) => onCreatedAfterChange(e.currentTarget.value)}
          style={{ minWidth: 150 }}
        />
        <TextInput
          label="Created before"
          type="date"
          value={createdBefore}
          onChange={(e) => onCreatedBeforeChange(e.currentTarget.value)}
          style={{ minWidth: 150 }}
        />
        {isAdmin && (
          <Select
            label="Agent type"
            value={isSystemFilter}
            onChange={onIsSystemChange}
            data={[
              { value: 'all', label: 'All agents' },
              { value: 'system', label: 'System only' },
              { value: 'user', label: 'User only' },
            ]}
            style={{ minWidth: 140 }}
          />
        )}
        <Box style={{ flex: 1 }} />
        {activeFilterCount > 0 && (
          <Button
            variant="subtle"
            leftSection={<IconX size={16} />}
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </Group>
    </Card>
  );
}
