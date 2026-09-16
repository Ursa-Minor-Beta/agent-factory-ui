import { Box, Text, Stack, Paper, Group, ActionIcon, Tooltip, ScrollArea } from '@mantine/core';
import { IconInfoCircle, IconPlus } from '@tabler/icons-react';
import type { NodeType } from '../../../api';

interface NodeTypeListProps {
  nodeTypes: NodeType[];
  onAdd: (nodeType: NodeType) => void;
  onViewDetails: (nodeType: NodeType) => void;
}

export function NodeTypeList({ nodeTypes, onAdd, onViewDetails }: NodeTypeListProps) {
  // Group by category
  const groupedNodeTypes = nodeTypes.reduce(
    (acc, nt) => {
      const category = nt.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(nt);
      return acc;
    },
    {} as Record<string, NodeType[]>
  );

  return (
    <ScrollArea style={{ flex: 1 }} offsetScrollbars>
      <Stack gap="xs">
        {Object.entries(groupedNodeTypes).map(([category, types]) => (
          <Box key={category}>
            <Text size="xs" c="dimmed" fw={600} mb={4}>
              {category}
            </Text>
            <Stack gap={4}>
              {types.map((nodeType) => (
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
                    <Group gap={2} wrap="nowrap">
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
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
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
