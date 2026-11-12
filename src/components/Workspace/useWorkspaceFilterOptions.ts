import { useEffect, useState } from 'react';
import { workspacesApi } from '../../api';
import type { FilterOption } from '../common/TableFilters';

/** Sent as `workspaceId=null` - resources not tied to any workspace */
export const GLOBAL_WORKSPACE = 'null';

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
