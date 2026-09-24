import { Group, Text, ActionIcon, ScrollArea } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { NodeType } from '../../api';
import type { AgentNode } from '../../types';
import { NodeTypeAddButtons } from './NodeTypeAddButtons';

interface NodeTypeDetailProps {
  nodeType: NodeType;
  currentNodes: AgentNode[];
  onBack: () => void;
  onAdd: (nodeType: NodeType, exampleIndex?: number) => void;
}

export function NodeTypeDetail({ nodeType, currentNodes, onBack, onAdd }: NodeTypeDetailProps) {
  const isDisabled = (nodeType.type === 'input' || nodeType.type === 'output') &&
    currentNodes.some(node => node.type === nodeType.type);

  const handleAdd = (nt: NodeType, exampleIndex?: number) => {
    onAdd(nt, exampleIndex);
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ActionIcon variant="subtle" size="sm" onClick={onBack}>
            <IconArrowLeft size={16} />
          </ActionIcon>
          <Text fw={600}>{nodeType.type}</Text>
        </Group>
        <NodeTypeAddButtons
          nodeType={nodeType}
          disabled={isDisabled}
          onAdd={handleAdd}
        />
      </Group>
      <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
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
    </div>
  );
}
