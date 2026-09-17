import { useState } from 'react';
import { Paper, Text, Alert, Center, Loader } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { NodeType } from '../../api';
import { NodeTypeList } from './NodeTypeList';
import { NodeTypeDetail } from './NodeTypeDetail';

interface NodeTypesPanelProps {
  nodeTypes: NodeType[];
  loading: boolean;
  error: string;
  width: number;
  onAddNode: (nodeType: NodeType) => void;
}

export function NodeTypesPanel({
  nodeTypes,
  loading,
  error,
  width,
  onAddNode,
}: NodeTypesPanelProps) {
  const [viewingNodeType, setViewingNodeType] = useState<NodeType | null>(null);

  return (
    <Paper
      withBorder
      p="md"
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {viewingNodeType ? (
        <NodeTypeDetail
          nodeType={viewingNodeType}
          onBack={() => setViewingNodeType(null)}
          onAdd={onAddNode}
        />
      ) : (
        <>
          <Text fw={600} mb="sm">
            Available Nodes
          </Text>

          {loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : error ? (
            <Alert color="red" icon={<IconAlertCircle size={14} />}>
              {error}
            </Alert>
          ) : (
            <NodeTypeList
              nodeTypes={nodeTypes}
              onAdd={onAddNode}
              onViewDetails={setViewingNodeType}
            />
          )}
        </>
      )}
    </Paper>
  );
}
