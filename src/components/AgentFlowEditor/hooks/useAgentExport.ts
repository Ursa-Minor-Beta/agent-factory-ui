import { useCallback, useState } from 'react';
import { agentsApi } from '../../../api';
import { downloadJson } from '../../../utils/download';

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
