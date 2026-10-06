import { Group, Text, ActionIcon, Tooltip, Menu, Divider } from '@mantine/core';
import { IconPlus, IconChevronDown, IconArrowLeft } from '@tabler/icons-react';
import type { NodeType } from '../../../api';
import { NodesList, SINGLETON_NODE_TYPES } from './NodesList';
import { NodeTypeDetail } from './NodeTypeDetail';

interface NodesTabProps {
  nodeTypes: NodeType[];
  existingNodeTypes: Set<string>;
  viewingNodeType: NodeType | null;
  onAddNode: (nodeType: NodeType, exampleIndex?: number) => void;
  onNodeClick: (nodeType: NodeType) => void;
  onBack: () => void;
}

export function NodesTab({ nodeTypes, existingNodeTypes, viewingNodeType, onAddNode, onNodeClick, onBack }: NodesTabProps) {
  if (viewingNodeType) {
    const isDisabled = SINGLETON_NODE_TYPES.has(viewingNodeType.type) && existingNodeTypes.has(viewingNodeType.type);

    return (
      <>
        <Group justify="space-between" align="center" p="xs">
          <Group gap="xs">
            <ActionIcon variant="subtle" size="xs" onClick={onBack}>
              <IconArrowLeft size={14} />
            </ActionIcon>
            <Text fw={600} size="sm" truncate style={{ maxWidth: 120 }}>
              {viewingNodeType.type}
            </Text>
          </Group>
          {viewingNodeType.examples && viewingNodeType.examples.length > 1 ? (
            <ActionIcon.Group>
              <Tooltip label={isDisabled ? 'Already added' : 'Add'}>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  disabled={isDisabled}
                  onClick={() => {
                    onAddNode(viewingNodeType, 0);
                    onBack();
                  }}
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
                  {viewingNodeType.examples!.map((example, index) => {
                    const exampleName = example.name || example.title || `Example ${index + 1}`;
                    return (
                      <Menu.Item
                        key={index}
                        onClick={() => {
                          onAddNode(viewingNodeType, index);
                          onBack();
                        }}
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
                onClick={() => {
                  onAddNode(viewingNodeType);
                  onBack();
                }}
              >
                <IconPlus size={12} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <Divider />
        <NodeTypeDetail nodeType={viewingNodeType} />
      </>
    );
  }

  return <NodesList nodeTypes={nodeTypes} existingNodeTypes={existingNodeTypes} onAddNode={onAddNode} onNodeClick={onNodeClick} />;
}
