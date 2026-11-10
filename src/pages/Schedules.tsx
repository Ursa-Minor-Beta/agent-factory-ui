import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { IconFolders } from '@tabler/icons-react';
import { useSearchParams } from 'react-router';
import { workspacesApi } from '../api';
import { SchedulesList } from '../components/Schedules';

const ALL = 'all';
const GLOBAL = 'null';
const WORKSPACE_PARAM = 'workspaceId';

export function SchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaceOptions, setWorkspaceOptions] = useState<{ value: string; label: string }[]>([]);

  // Workspace filter in the URL: omitted = all, 'null' = global only, id = that workspace
  const filter = searchParams.get(WORKSPACE_PARAM) ?? ALL;
  const workspaceId = filter === ALL ? undefined : filter === GLOBAL ? null : filter;

  useEffect(() => {
    workspacesApi
      .list({ sortBy: 'name', sortOrder: 'asc', limit: 100 })
      .then(({ workspaces }) => setWorkspaceOptions(workspaces.map((w) => ({ value: w.id, label: w.name }))))
      .catch(() => setWorkspaceOptions([]));
  }, []);

  const handleFilterChange = (value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === ALL) next.delete(WORKSPACE_PARAM);
      else next.set(WORKSPACE_PARAM, value);
      return next;
    });
  };

  return (
    <SchedulesList
      description="Run agents automatically on a schedule"
      workspaceId={workspaceId}
      columns={['workspace', 'name', 'status', 'schedule', 'nextRun', 'lastRun', 'enabled', 'actions']}
      toolbar={
        <Select
          value={filter}
          onChange={handleFilterChange}
          data={[
            { value: ALL, label: 'All workspaces' },
            { value: GLOBAL, label: 'Global' },
            ...workspaceOptions,
          ]}
          leftSection={<IconFolders size={16} />}
          allowDeselect={false}
          w={200}
        />
      }
    />
  );
}
