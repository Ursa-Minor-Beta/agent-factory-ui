import type { NodeType } from '../../../../api';
import type { ChatClientTool } from '../../../../api/sessions';
import type { AgentNode } from '../../../../types/agent';
import type { AgentStreamResult } from '../../../AgentStream/useAgentStream';
import { validateGraph, type GraphValidation } from '../../utils/validateGraph';

// LLM node(s) of the builder agent that get the editor tools
const TOOL_NODE_IDS = ['llm-builder'];

// Response is returned to the LLM - keep its context small
const MAX_RUN_RESPONSE_CHARS = 8000;

export interface AssistantEditor {
  getNodes: () => AgentNode[];
  upsertNode: (node: AgentNode) => void;
  removeNode: (nodeId: string) => void;
  nodeTypes: NodeType[];
  // Saves the graph (creates the agent if new) - saved agent id, null on failure
  save: () => Promise<string | null>;
  // Saves, then runs in the Run tab
  run: (input?: Record<string, unknown>) => Promise<AgentStreamResult>;
}

export const ASSISTANT_CLIENT_TOOLS: ChatClientTool[] = [
  {
    name: 'editor_set_node',
    description: 'Add a node to the editor, or replace the node with the same id. Send the full node.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object' },
        runAfter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids of nodes that must finish before this node runs (ordering only, no data passed)',
        },
      },
      required: ['id', 'type', 'data'],
    },
    nodeIds: TOOL_NODE_IDS,
  },
  {
    name: 'editor_remove_node',
    description: 'Remove a node from the editor',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    nodeIds: TOOL_NODE_IDS,
  },
  {
    name: 'editor_save_agent',
    description: 'Save the agent from the editor. A new agent is created on first save - required before it can run.',
    parameters: { type: 'object', properties: {} },
    nodeIds: TOOL_NODE_IDS,
  },
  {
    name: 'editor_run_agent',
    description:
      'Save and run the agent, returns its response or error. Use it to test the agent after changes. ' +
      'Input keys must match the input node schema.',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'object', description: 'Agent input, e.g. { "url": "https://example.com" }' },
      },
    },
    nodeIds: TOOL_NODE_IDS,
  },
];

type ToolResult =
  | GraphValidation
  | { ok: boolean; errors?: string[]; agentId?: string; runId?: string; response?: string; warnings?: string[] };

export interface ToolExecution {
  // Short human-readable line for the chat
  summary: string;
  // Sent back to the server as the tool result
  result: ToolResult;
}

const fail = (summary: string, error: string): ToolExecution => ({ summary, result: { ok: false, errors: [error] } });

// Graph as sent to the assistant - positions are editor-only noise
export function nodesForAssistant(nodes: AgentNode[]): AgentNode[] {
  return nodes.map(({ position: _position, ...node }) => node);
}

export async function executeAssistantTool(editor: AssistantEditor, name: string, args: Record<string, unknown>): Promise<ToolExecution> {
  const id = typeof args.id === 'string' ? args.id.trim() : '';

  switch (name) {
    case 'editor_set_node': {
      const summary = `Set node ${id || '?'}`;
      const { type, data, runAfter } = args;
      if (!id) return fail(summary, 'id is required');
      if (typeof type !== 'string' || !type) return fail(summary, 'type is required');
      if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(summary, 'data must be an object');
      if (editor.nodeTypes.length && !editor.nodeTypes.some((t) => t.type === type)) {
        return fail(summary, `unknown node type "${type}", available: ${editor.nodeTypes.map((t) => t.type).join(', ')}`);
      }
      const runAfterIds = Array.isArray(runAfter) ? runAfter.filter((v): v is string => typeof v === 'string') : [];
      editor.upsertNode({
        id,
        type,
        data: data as AgentNode['data'],
        ...(runAfterIds.length ? { runAfter: runAfterIds } : {}),
      });
      return { summary, result: validateGraph(editor.getNodes(), editor.nodeTypes) };
    }

    case 'editor_remove_node': {
      const summary = `Remove node ${id || '?'}`;
      if (!id) return fail(summary, 'id is required');
      if (!editor.getNodes().some((n) => n.id === id)) return fail(summary, `node "${id}" does not exist`);
      editor.removeNode(id);
      return { summary, result: validateGraph(editor.getNodes(), editor.nodeTypes) };
    }

    case 'editor_save_agent': {
      const summary = 'Save agent';
      // Save even with validation errors (user may want a draft), but report them
      const validation = validateGraph(editor.getNodes(), editor.nodeTypes);
      const agentId = await editor.save();
      if (!agentId) return fail(summary, 'save failed');
      return { summary, result: { ...validation, ok: true, agentId } };
    }

    case 'editor_run_agent': {
      const summary = 'Run agent';
      const { input } = args;
      if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) {
        return fail(summary, 'input must be an object');
      }
      const run = await editor.run(input as Record<string, unknown> | undefined);
      if (run.error) return { summary, result: { ok: false, errors: [run.error], runId: run.runId } };
      if (run.cancelled || run.aborted) return { summary, result: { ok: false, errors: ['run was stopped'], runId: run.runId } };
      const response = run.response ?? '';
      return {
        summary,
        result: {
          ok: true,
          runId: run.runId,
          response: response.length > MAX_RUN_RESPONSE_CHARS
            ? `${response.slice(0, MAX_RUN_RESPONSE_CHARS)}… [truncated, ${response.length} chars]`
            : response,
        },
      };
    }

    default:
      return fail(`Unknown tool ${name}`, `unknown tool "${name}"`);
  }
}
