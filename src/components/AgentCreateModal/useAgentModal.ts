import { useSearchParams } from 'react-router';

const AGENT_PARAM = 'agent';
const NEW_AGENT = 'new';

/**
 * Hook for managing agent create/edit modal state via URL query parameters.
 * Provides deep linking and browser navigation support for the agent modal.
 *
 * @example
 * ```tsx
 * const { agentId, isOpen, isNewMode, openCreateAgent, openEditAgent, closeAgent } = useAgentModal();
 *
 * // Open create modal
 * openCreateAgent();
 *
 * // Open edit modal
 * openEditAgent('agent-123');
 *
 * // Render modal (in Layout.tsx)
 * <AgentCreateModal />
 * ```
 */
export function useAgentModal() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current agent ID from URL
  const agentId = searchParams.get(AGENT_PARAM);
  const isOpen = !!agentId;
  const isNewMode = agentId === NEW_AGENT;

  /**
   * Open modal in create mode.
   * Sets ?agent=new in URL.
   */
  const openCreateAgent = () => {
    setSearchParams({ [AGENT_PARAM]: NEW_AGENT });
  };

  /**
   * Open modal in edit mode for the specified agent.
   * Sets ?agent=<id> in URL.
   */
  const openEditAgent = (id: string) => {
    setSearchParams({ [AGENT_PARAM]: id });
  };

  /**
   * Close the agent modal.
   * Removes the agent query parameter from URL.
   */
  const closeAgent = () => {
    setSearchParams({});
  };

  return {
    /** Current agent ID from URL ('new' for create mode, null if modal closed) */
    agentId,
    /** Whether the modal is open */
    isOpen,
    /** Whether in create mode (true) or edit mode (false) */
    isNewMode,
    /** Open modal in create mode */
    openCreateAgent,
    /** Open modal in edit mode with specified agent ID */
    openEditAgent,
    /** Close the modal */
    closeAgent,
  };
}
