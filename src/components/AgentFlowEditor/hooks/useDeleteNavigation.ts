import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../config/routes';

// Agents opened in the editor during this session, most recent last - used to pick where to go after a delete
const visitedAgents: { id: string; workspaceId?: string }[] = [];

export function useDeleteNavigation(agentId: string | undefined, workspaceId: string | undefined) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!agentId) return;
    const i = visitedAgents.findIndex((v) => v.id === agentId);
    if (i !== -1) visitedAgents.splice(i, 1);
    visitedAgents.push({ id: agentId, workspaceId });
  }, [agentId, workspaceId]);

  // After delete: open the previously visited agent of the same workspace, else the workspace, else the agents list
  return useCallback(() => {
    const i = visitedAgents.findIndex((v) => v.id === agentId);
    if (i !== -1) visitedAgents.splice(i, 1);
    // Most recently visited agent from the same workspace
    const previousId = visitedAgents.findLast((v) => v.workspaceId === workspaceId)?.id;
    const target = previousId
      ? routes.agentEditor(previousId)
      : workspaceId ? routes.workspace(workspaceId) : routes.agents();
    navigate(target, { replace: true });
  }, [agentId, workspaceId, navigate]);
}
