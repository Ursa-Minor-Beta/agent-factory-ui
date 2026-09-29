import { useMemo } from 'react';
import { Box, Text, Stack, ScrollArea, Center, Loader, Group, ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconPlus, IconChevronDown } from '@tabler/icons-react';
import type { NodeType } from '../../../api';

// Node types that can only exist once per agent
export const SINGLETON_NODE_TYPES = new Set(['input', 'output']);

interface NodesListProps {
  nodeTypes: NodeType[];
  existingNodeTypes: Set<string>;
  onAddNode: (nodeType: NodeType, exampleIndex?: number) => void;
  onNodeClick: (nodeType: NodeType) => void;
}

export function NodesList({ nodeTypes, existingNodeTypes, onAddNode, onNodeClick }: NodesListProps) {
  // Sort nodes: enabled first, disabled at the end
  const sortedNodeTypes = useMemo(() => {
    const isDisabled = (type: string) => SINGLETON_NODE_TYPES.has(type) && existingNodeTypes.has(type);
    return [...nodeTypes].sort((a, b) => {
      const aDisabled = isDisabled(a.type);
      const bDisabled = isDisabled(b.type);
      if (aDisabled === bDisabled) return 0;
      return aDisabled ? 1 : -1;
    });
  }, [nodeTypes, existingNodeTypes]);

  if (nodeTypes.length === 0) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <ScrollArea flex={1} p="xs" scrollbarSize={6}>
      <Stack gap="xs">
        {sortedNodeTypes.map((nodeType) => {
          const hasMultipleExamples = nodeType.examples && nodeType.examples.length > 1;
          const isDisabled = SINGLETON_NODE_TYPES.has(nodeType.type) && existingNodeTypes.has(nodeType.type);

          return (
            <Box
              key={nodeType.type}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--mantine-radius-sm)',
                border: '1px solid var(--mantine-color-default-border)',
                cursor: 'pointer',
                opacity: isDisabled ? 0.5 : 1,
              }}
              onClick={() => onNodeClick(nodeType)}
            >
              <Group justify="space-between" wrap="nowrap" gap={4}>
                <Text size="xs" truncate style={{ flex: 1 }}>
                  {nodeType.name || nodeType.type}
                </Text>
                <div onClick={(e) => e.stopPropagation()}>
                  {hasMultipleExamples ? (
                    <ActionIcon.Group>
                      <Tooltip label={isDisabled ? 'Already added' : 'Add'}>
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          disabled={isDisabled}
                          onClick={() => onAddNode(nodeType, 0)}
                        >
                          <IconPlus size={12} />
                        </ActionIcon>
                      </Tooltip>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <Tooltip label="Select">
                            <ActionIcon variant="subtle" size="xs" disabled={isDisabled}>
                              <IconChevronDown size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {nodeType.examples!.map((example, index) => {
                            const exampleName = example.name || example.title || `Example ${index + 1}`;
                            return (
                              <Menu.Item
                                key={index}
                                onClick={() => onAddNode(nodeType, index)}
                              >
                                {exampleName}
                              </Menu.Item>
                            );
                          })}
                        </Menu.Dropdown>
                      </Menu>
                    </ActionIcon.Group>
                  ) : (
                    <Tooltip label={isDisabled ? 'Already added' : 'Add'}>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        disabled={isDisabled}
                        onClick={() => onAddNode(nodeType)}
                      >
                        <IconPlus size={12} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </div>
              </Group>
            </Box>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
