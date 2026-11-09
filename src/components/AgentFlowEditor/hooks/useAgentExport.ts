import { useCallback, useState } from 'react';
import { agentsApi } from '../../../api';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useAgentExport(agentId: string | undefined) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!agentId) return;
    setExporting(true);
    try {
      const exportData = await agentsApi.export(agentId);
      const agentName = exportData.agent?.name || 'agent';
      downloadJson(exportData, `${agentName}.agent.json`);
    } catch (err) {
      console.error('Failed to export agent:', err);
    } finally {
      setExporting(false);
    }
  }, [agentId]);

  return { exporting, handleExport };
}
