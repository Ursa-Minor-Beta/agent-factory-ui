import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { workspacesApi } from '../../api/workspaces';
import type { Workspace } from '../../types/workspace';
import { downloadJson, safeFilename } from '../../utils/download';

// Downloads the workspace as <name>.workspace.json - returns the id being exported to show a loader
export function useWorkspaceExport() {
  const [exportingId, setExportingId] = useState<string | null>(null);

  const exportWorkspace = useCallback(async (workspace: Pick<Workspace, 'id' | 'name'>) => {
    setExportingId(workspace.id);
    try {
      const data = await workspacesApi.export(workspace.id);
      downloadJson(data, `${safeFilename(workspace.name, 'workspace')}.workspace.json`);
      notifications.show({
        color: 'cyan',
        title: `Exported ${workspace.name}`,
        message: 'Agents from other workspaces that this workspace calls are included and will become part of the imported workspace.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Failed to export workspace',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setExportingId(null);
    }
  }, []);

  return { exportingId, exportWorkspace };
}
