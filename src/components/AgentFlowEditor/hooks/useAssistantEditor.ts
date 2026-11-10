import { useMemo, useRef } from 'react';
import type { useAgentEditor } from './useAgentEditor';
import type { AgentRunner } from '../PanelLeft/RunTab';
import { useLatest } from './useLatest';
import { RUN_START_ATTEMPTS, RUN_START_RETRY_MS } from '../constants';

type AgentEditor = ReturnType<typeof useAgentEditor>;

type UseAssistantEditorOptions = Pick<AgentEditor, 'agent' | 'getAgentNodes' | 'upsertNode' | 'removeNode' | 'updateAgentMeta'> & {
  nodeTypes: AgentEditor['nodeTypes'];
  selectedNodeId: string | undefined;
  save: () => Promise<string | null>;
};

// Editor API for the assistant tools. Tools call the latest save / Run tab runner through refs, keeping it stable
export function useAssistantEditor({
  agent,
  getAgentNodes,
  upsertNode,
  removeNode,
  updateAgentMeta,
  nodeTypes,
  selectedNodeId,
  save,
}: UseAssistantEditorOptions) {
  const saveRef = useLatest(save);
  const agentRef = useLatest(agent);
  const updateAgentMetaRef = useLatest(updateAgentMeta);
  const selectedNodeIdRef = useLatest(selectedNodeId);
  const runnerRef = useRef<AgentRunner | null>(null);

  const assistantEditor = useMemo(
    () => ({
      getNodes: getAgentNodes,
      upsertNode,
      removeNode,
      nodeTypes,
      save: () => saveRef.current(),
      getSelection: () => (selectedNodeIdRef.current ? [selectedNodeIdRef.current] : []),
      getAgentInfo: () => ({
        name: agentRef.current?.name ?? '',
        description: agentRef.current?.description ?? '',
        workspaceId: agentRef.current?.workspaceId ?? null,
      }),
      updateAgentInfo: (data: { name?: string; description?: string; workspaceId?: string | null }) =>
        updateAgentMetaRef.current(data),
      run: async (input?: Record<string, unknown>) => {
        // Backend runs the saved version - save first so the latest edits run
        const savedId = await saveRef.current();
        if (!savedId) return { error: 'Failed to save the agent' };
        // A just-created agent reaches the Run tab on the next render - retry briefly
        for (let attempt = 0; attempt < RUN_START_ATTEMPTS; attempt++) {
          const result = await runnerRef.current?.(input);
          if (result) return result;
          await new Promise((resolve) => setTimeout(resolve, RUN_START_RETRY_MS));
        }
        return { error: 'Could not start the run - another run may be in progress' };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
    [getAgentNodes, upsertNode, removeNode, nodeTypes]
  );

  return { assistantEditor, runnerRef };
}
