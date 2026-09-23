import { useState } from 'react';
import { Paper, Text, Alert, Center, Loader, Box } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { NodeType } from '../../api';
import { NodeTypeList } from './NodeTypeList';
import { NodeTypeDetail } from './NodeTypeDetail';

interface NodeTypesPanelProps {
  nodeTypes: NodeType[];
  loading: boolean;
  error: string;
  width: number | string;
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
    <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {viewingNodeType ? (
        <NodeTypeDetail
          nodeType={viewingNodeType}
          onBack={() => setViewingNodeType(null)}
          onAdd={onAddNode}
        />
      ) : (
        <>
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
    </Box>
  );
}
