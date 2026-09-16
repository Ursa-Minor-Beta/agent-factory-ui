import { Text, Stack, Paper, Group, ActionIcon, Tooltip, ScrollArea } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { NodeType } from '../../../api';

interface NodeTypeListProps {
  nodeTypes: NodeType[];
  onAdd: (nodeType: NodeType) => void;
  onViewDetails: (nodeType: NodeType) => void;
}

export function NodeTypeList({ nodeTypes, onAdd, onViewDetails }: NodeTypeListProps) {
  return (
    <ScrollArea style={{ flex: 1 }} offsetScrollbars>
      <Stack gap={4}>
        {nodeTypes.map((nodeType) => (
          <Paper
            key={nodeType.type}
            withBorder
            p="xs"
            style={{ cursor: 'pointer' }}
            title="Details"
            onClick={() => onViewDetails(nodeType)}
          >
            <Group justify="space-between" wrap="nowrap" gap={4}>
              <Text size="sm" fw={500} truncate style={{ flex: 1 }}>
                {nodeType.type}
              </Text>
              <Tooltip label="Add node">
                <ActionIcon
                  variant="subtle"
                  color="cyan"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(nodeType);
                  }}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Paper>
        ))}
        {nodeTypes.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No node types available
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}
