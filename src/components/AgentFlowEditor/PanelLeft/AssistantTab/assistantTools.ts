import type { NodeType } from '../../../../api';
import type { ChatClientTool } from '../../../../api/sessions';
import type { AgentNode } from '../../../../types/agent';
import { validateGraph, type GraphValidation } from '../../utils/validateGraph';

// LLM node(s) of the builder agent that get the editor tools
const TOOL_NODE_IDS = ['llm-builder'];

export interface AssistantEditor {
  getNodes: () => AgentNode[];
  upsertNode: (node: AgentNode) => void;
  removeNode: (nodeId: string) => void;
  nodeTypes: NodeType[];
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
];

export interface ToolExecution {
  // Short human-readable line for the chat
  summary: string;
  // Sent back to the server as the tool result
  result: GraphValidation | { ok: false; errors: string[] };
}

const fail = (summary: string, error: string): ToolExecution => ({ summary, result: { ok: false, errors: [error] } });

// Graph as sent to the assistant - positions are editor-only noise
export function nodesForAssistant(nodes: AgentNode[]): AgentNode[] {
  return nodes.map(({ position: _position, ...node }) => node);
}

export function executeAssistantTool(editor: AssistantEditor, name: string, args: Record<string, unknown>): ToolExecution {
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

    default:
      return fail(`Unknown tool ${name}`, `unknown tool "${name}"`);
  }
}
