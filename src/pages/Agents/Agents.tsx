import { Box } from '@mantine/core';
import { AgentsList } from '../../components/AgentsList';

export function AgentsPage() {
  return (
    <Box>
      <AgentsList
        showFilters={true}
        showPagination={true}
        showCreateButton={true}
      />
    </Box>
  );
}
