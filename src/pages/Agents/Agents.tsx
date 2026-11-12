import { Box } from '@mantine/core';
import { AgentsList } from '../../components/AgentsList';

export function AgentsPage() {
  return (
    <Box>
      <AgentsList
        showCreateButton={true}
      />
    </Box>
  );
}
