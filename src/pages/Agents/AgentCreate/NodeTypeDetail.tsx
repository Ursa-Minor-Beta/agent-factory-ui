import { Group, Text, ActionIcon, Button, ScrollArea } from '@mantine/core';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import type { NodeType } from '../../../api';

interface NodeTypeDetailProps {
  nodeType: NodeType;
  onBack: () => void;
  onAdd: (nodeType: NodeType) => void;
}

export function NodeTypeDetail({ nodeType, onBack, onAdd }: NodeTypeDetailProps) {
  return (
    <>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ActionIcon variant="subtle" size="sm" onClick={onBack}>
            <IconArrowLeft size={16} />
          </ActionIcon>
          <Text fw={600}>{nodeType.type}</Text>
        </Group>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            onAdd(nodeType);
            onBack();
          }}
        >
          Add
        </Button>
      </Group>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <pre
          style={{
            fontSize: 11,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(nodeType, null, 2)}
        </pre>
      </ScrollArea>
    </>
  );
}
