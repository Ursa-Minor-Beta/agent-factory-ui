import { useEffect, useState } from 'react';
import { workspacesApi } from '../../api';
import type { FilterOption } from '../common/TableFilters';

/** Select value for resources not tied to any workspace (mapped to `workspaceId: null` for the API).
 * Not 'null': Mantine Select treats it as equal to an empty value, so picking it first did nothing */
export const GLOBAL_WORKSPACE = 'global';

/** Options for a workspace filter select: "Global" followed by every workspace */
export function useWorkspaceFilterOptions(enabled = true): FilterOption[] {
  const [options, setOptions] = useState<FilterOption[]>([]);

  useEffect(() => {
    if (!enabled) return;
    workspacesApi
      .list({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
      .then(({ workspaces }) =>
        setOptions(workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name })))
      )
      .catch(() => setOptions([]));
  }, [enabled]);

  return [{ value: GLOBAL_WORKSPACE, label: 'Global' }, ...options];
}
