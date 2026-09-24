import { useState, useEffect, useCallback } from 'react';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';
import { AgentCreateModal } from './AgentCreateModal';
import { useAgentModal } from './useAgentModal';

/**
 * Wrapper component for AgentCreateModal that reads state from URL.
 * Fetches agent data when in edit mode.
 * This is the component that should be added to Layout.tsx.
 */
export function AgentModalWrapper() {
  const { agentId, isOpen, isNewMode, closeAgent } = useAgentModal();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch agent when in edit mode
  useEffect(() => {
    if (!isOpen || isNewMode) {
      setAgent(null);
      return;
    }

    const fetchAgent = async () => {
      if (!agentId) return;

      try {
        setLoading(true);
        const data = await agentsApi.getById(agentId);
        setAgent(data);
      } catch (err) {
        console.error('Failed to load agent:', err);
        setAgent(null);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
    // Note: closeAgent is intentionally not in deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isNewMode, agentId]);

  // Handle save - dispatch event for pages to refresh
  // Modal's internal logic handles closing when appropriate
  const handleSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent('agent-saved'));
  }, []);

  // Always render the modal - it will handle loading state
  // In edit mode, wait for agent to load before showing
  const shouldShow = isOpen && (isNewMode || (!loading && agent !== null));

  return (
    <AgentCreateModal
      opened={shouldShow}
      onClose={closeAgent}
      onSave={handleSave}
      agent={agent}
    />
  );
}
