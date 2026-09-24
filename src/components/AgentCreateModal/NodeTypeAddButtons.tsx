import { ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconPlus, IconChevronDown } from '@tabler/icons-react';
import type { NodeType } from '../../api';

interface NodeTypeAddButtonsProps {
  nodeType: NodeType;
  disabled: boolean;
  onAdd: (nodeType: NodeType, exampleIndex?: number) => void;
}

export function NodeTypeAddButtons({ nodeType, disabled, onAdd }: NodeTypeAddButtonsProps) {
  const hasMultipleExamples = nodeType.examples && nodeType.examples.length > 1;

  if (hasMultipleExamples) {
    return (
      <ActionIcon.Group>
        <Tooltip label={disabled ? 'Already exists' : 'Add first example'}>
          <ActionIcon
            variant="outline"
            color="cyan"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e?.stopPropagation();
              if (!disabled) {
                onAdd(nodeType, 0);
              }
            }}
          >
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Tooltip label={disabled ? 'Already exists' : 'Select example'}>
              <ActionIcon
                variant="outline"
                color="cyan"
                size="sm"
                disabled={disabled}
              >
                <IconChevronDown size={14} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {nodeType.examples!.map((example, index) => {
              const exampleName = example.name || example.title || `Example ${index + 1}`;
              return (
                <Menu.Item
                  key={index}
                  onClick={() => {
                    if (!disabled) {
                      onAdd(nodeType, index);
                    }
                  }}
                >
                  {exampleName}
                </Menu.Item>
              );
            })}
          </Menu.Dropdown>
        </Menu>
      </ActionIcon.Group>
    );
  }

  return (
    <Tooltip label={disabled ? 'Already exists' : 'Add node'}>
      <ActionIcon
        variant="outline"
        color="cyan"
        size="sm"
        disabled={disabled}
        onClick={(e) => {
          e?.stopPropagation();
          if (!disabled) {
            onAdd(nodeType);
          }
        }}
      >
        <IconPlus size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
