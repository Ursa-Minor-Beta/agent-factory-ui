import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { Box } from '@mantine/core';
import { AgentFlowEditor } from '../../components/AgentFlowEditor';

export function AgentEditorPage() {
  const { agentId } = useParams<{ agentId: string }>();

  return (
    <Box
      style={{
        height: '100vh',
        margin: 'calc(-1 * var(--mantine-spacing-md))',
      }}
    >
      <ReactFlowProvider>
        <AgentFlowEditor agentId={agentId} />
      </ReactFlowProvider>
    </Box>
  );
}
