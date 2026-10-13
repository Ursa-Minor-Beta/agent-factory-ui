import { useParams, useSearchParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { Box } from '@mantine/core';
import { AgentFlowEditor } from '../../components/AgentFlowEditor';

export function AgentEditorPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId') || undefined;

  return (
    <Box
      style={{
        height: '100vh',
        margin: 'calc(-1 * var(--mantine-spacing-md))',
      }}
    >
      <ReactFlowProvider>
        <AgentFlowEditor agentId={agentId} workspaceId={workspaceId} />
      </ReactFlowProvider>
    </Box>
  );
}
