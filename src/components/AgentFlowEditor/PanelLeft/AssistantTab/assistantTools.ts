import type { NodeType } from '../../../../api';
import { workspacesApi } from '../../../../api/workspaces';
import type { ChatClientTool } from '../../../../api/sessions';
import type { AgentNode } from '../../../../types/agent';
import type { AgentStreamResult } from '../../../AgentStream/useAgentStream';
import { validateGraph, type GraphValidation } from '../../utils/validateGraph';
import { extractBranchTargets, extractNodeReferencePaths } from '../../utils/converters';

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
  // Ids of the nodes selected on the canvas
  getSelection: () => string[];
  // Canvas flow direction: LR = left to right, TB = top to bottom
  getLayoutDirection: () => 'LR' | 'TB';
  getAgentInfo: () => AgentInfo;
  // Persists for a saved agent, local until first save for a new one - false on failure
  updateAgentInfo: (data: Partial<AgentInfo>) => Promise<boolean>;
}

export interface AgentInfo {
  name: string;
  description: string;
  workspaceId: string | null;
}

export const ASSISTANT_CLIENT_TOOLS: ChatClientTool[] = [
  {
    name: 'editor_get_nodes',
    description:
      'Get the current nodes from the editor. Pass ids to get only those nodes, omit to get all. ' +
      'Data is shortened: long text becomes "<text, N chars>", arrays "<array, N items>", objects show their key structure. ' +
      'Pass fullValueFor with data keys (e.g. ["systemPrompt"]) to get those values in full before changing them.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: 'Node ids to get, omit for all nodes' },
        fullValueFor: {
          type: 'array',
          items: { type: 'string' },
          description: 'Data keys to return in full, without shortening',
        },
      },
    },
    nodeIds: TOOL_NODE_IDS,
  },
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
        disabled: {
          type: 'boolean',
          description: 'Skip this node at runtime (nodes depending only on it are skipped too). Not allowed for input/output',
        },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
          description:
            'Canvas position. Follow the graph layoutDirection (LR: next step to the right, TB: next step below). ' +
            'Place a node after all nodes in its refs/runAfter and near them, so edges stay short and do not cross. ' +
            'Omit to keep the current one (or auto-place a new node)',
        },
      },
      required: ['id', 'type', 'data'],
    },
    nodeIds: TOOL_NODE_IDS,
  },
  {
    name: 'editor_update_node',
    description:
      'Change only some fields of an existing node. data is merged into the current node data (send only changed keys, ' +
      'null removes a key). Omitted runAfter/disabled/position are kept.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        data: { type: 'object', description: 'Data keys to change' },
        runAfter: { type: 'array', items: { type: 'string' }, description: 'Replaces the current runAfter list' },
        disabled: { type: 'boolean' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
        },
      },
      required: ['id'],
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
    description: 'Save the agent from the editor. A new agent is created on first save - required before it can run. Save after you update all nodes.',
    parameters: { type: 'object', properties: {} },
    nodeIds: TOOL_NODE_IDS,
  },
  {
    name: 'editor_set_agent_info',
    description:
      'Update the agent name, description and/or workspace. Send only the fields to change. ' +
      'workspace is a workspace name or id, empty string removes the agent from its workspace.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        workspace: { type: 'string' },
      },
    },
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
  | {
      ok: boolean;
      errors?: string[];
      agentId?: string;
      runId?: string;
      response?: string;
      warnings?: string[];
      agent?: AgentInfo & { workspaceName?: string };
      nodes?: AgentNode[];
    };

export interface ToolExecution {
  // Short human-readable line for the chat
  summary: string;
  // Sent back to the server as the tool result
  result: ToolResult;
}

const fail = (summary: string, error: string): ToolExecution => ({ summary, result: { ok: false, errors: [error] } });

// Compact graph sent with each message - full node data is fetched via editor_get_nodes
export function graphOutlineForAssistant(nodes: AgentNode[], nodeTypes: NodeType[], layoutDirection: 'LR' | 'TB') {
  const ids = new Set(nodes.map((n) => n.id));
  return {
    layoutDirection,
    nodes: nodes.map(({ id, type, position, runAfter, disabled, data }) => {
      // Data edges as drawn on the canvas: {{node:...}} reference paths and branch targets keyed by branch name
      const refs = [...extractNodeReferencePaths(data)].filter((ref) => {
        const refId = ref.split('.')[0];
        return refId !== id && ids.has(refId);
      });
      const branches = Array.isArray(data.branches) ? (data.branches as { name?: string }[]) : [];
      const branchTargets: Record<string, string[]> = {};
      extractBranchTargets(type, data).forEach(({ sourceHandle, target }) => {
        if (!ids.has(target)) return;
        const index = Number(sourceHandle.replace('branch-', ''));
        const name = branches[index]?.name || sourceHandle;
        (branchTargets[name] ??= []).push(target);
      });
      return {
        id,
        type,
        ...(position ? { position: { x: Math.round(position.x), y: Math.round(position.y) } } : {}),
        ...(refs.length ? { refs } : {}),
        ...(Object.keys(branchTargets).length ? { branchTargets } : {}),
        ...(runAfter?.length ? { runAfter } : {}),
        ...(disabled ? { disabled } : {}),
      };
    }),
    validation: validateGraph(nodes, nodeTypes),
  };
}

// Graph as sent to the assistant - positions are editor-only noise
export function nodesForAssistant(nodes: AgentNode[]): AgentNode[] {
  return nodes.map(({ position: _position, ...node }) => node);
}

const SHORT_TEXT_MAX = 300;

// Compact preview of a data value for editor_get_nodes - long text/arrays as sizes, objects as key structure
function shortenValue(value: unknown): unknown {
  if (typeof value === 'string') return value.length > SHORT_TEXT_MAX ? `<text, ${value.length} chars>` : value;
  if (Array.isArray(value)) return `<array, ${value.length} items>`;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, shortenValue(v)]));
  }
  return value;
}

export async function executeAssistantTool(editor: AssistantEditor, name: string, args: Record<string, unknown>): Promise<ToolExecution> {
  const id = typeof args.id === 'string' ? args.id.trim() : '';

  switch (name) {
    case 'editor_get_nodes': {
      const fullValueFor = new Set(
        Array.isArray(args.fullValueFor) ? args.fullValueFor.filter((v): v is string => typeof v === 'string') : []
      );
      const nodes = nodesForAssistant(editor.getNodes()).map((node) => ({
        ...node,
        data: Object.fromEntries(
          Object.entries(node.data ?? {}).map(([key, value]) => [key, fullValueFor.has(key) ? value : shortenValue(value)])
        ) as AgentNode['data'],
      }));
      const ids = Array.isArray(args.ids) ? args.ids.filter((v): v is string => typeof v === 'string') : [];
      if (!ids.length) return { summary: 'Read all nodes', result: { ok: true, nodes } };
      const found = nodes.filter((n) => ids.includes(n.id));
      const missing = ids.filter((nodeId) => !found.some((n) => n.id === nodeId));
      return {
        summary: `Read nodes ${ids.join(', ')}`,
        result: { ok: true, nodes: found, ...(missing.length ? { errors: missing.map((m) => `node "${m}" does not exist`) } : {}) },
      };
    }

    case 'editor_set_node': {
      const summary = `Set node ${id || '?'}`;
      const { type, data, runAfter, disabled, position } = args;
      if (!id) return fail(summary, 'id is required');
      if (typeof type !== 'string' || !type) return fail(summary, 'type is required');
      if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(summary, 'data must be an object');
      const nodeType = editor.nodeTypes.find((t) => t.type === type);
      if (editor.nodeTypes.length && !nodeType) {
        return fail(summary, `unknown node type "${type}", available: ${editor.nodeTypes.map((t) => t.type).join(', ')}`);
      }
      // Only declared options (plus input schema) may be set - reject made-up fields.
      // Types without options (e.g. output) have free-form data keys
      if (nodeType?.options?.length) {
        const allowed = new Set(['schema', ...nodeType.options.map((o) => o.name)]);
        const unknown = Object.keys(data).filter((key) => !allowed.has(key));
        if (unknown.length) {
          return fail(summary, `unknown data fields ${unknown.join(', ')} for "${type}", allowed: ${[...allowed].join(', ')}`);
        }
      }
      const pos = position as { x?: unknown; y?: unknown } | undefined;
      if (pos !== undefined && !(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y))) {
        return fail(summary, 'position must be { x: number, y: number }');
      }
      const runAfterIds = Array.isArray(runAfter) ? runAfter.filter((v): v is string => typeof v === 'string') : [];
      editor.upsertNode({
        id,
        type,
        data: data as AgentNode['data'],
        ...(pos ? { position: { x: pos.x as number, y: pos.y as number } } : {}),
        ...(runAfterIds.length ? { runAfter: runAfterIds } : {}),
        ...(disabled === true ? { disabled: true } : {}),
      });
      return { summary, result: validateGraph(editor.getNodes(), editor.nodeTypes) };
    }

    case 'editor_update_node': {
      const summary = `Update node ${id || '?'}`;
      const { data, runAfter, disabled, position } = args;
      if (!id) return fail(summary, 'id is required');
      const existing = editor.getNodes().find((n) => n.id === id);
      if (!existing) return fail(summary, `node "${id}" does not exist`);
      if (data !== undefined && (!data || typeof data !== 'object' || Array.isArray(data))) {
        return fail(summary, 'data must be an object');
      }
      const patch = (data ?? {}) as Record<string, unknown>;
      const nodeType = editor.nodeTypes.find((t) => t.type === existing.type);
      if (nodeType?.options?.length) {
        const allowed = new Set(['schema', ...nodeType.options.map((o) => o.name)]);
        const unknown = Object.keys(patch).filter((key) => !allowed.has(key));
        if (unknown.length) {
          return fail(summary, `unknown data fields ${unknown.join(', ')} for "${existing.type}", allowed: ${[...allowed].join(', ')}`);
        }
      }
      const pos = position as { x?: unknown; y?: unknown } | undefined;
      if (pos !== undefined && !(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y))) {
        return fail(summary, 'position must be { x: number, y: number }');
      }
      const merged: Record<string, unknown> = { ...existing.data };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete merged[key];
        else merged[key] = value;
      }
      const runAfterIds = Array.isArray(runAfter)
        ? runAfter.filter((v): v is string => typeof v === 'string')
        : existing.runAfter ?? [];
      const isDisabled = typeof disabled === 'boolean' ? disabled : !!existing.disabled;
      const { runAfter: _runAfter, disabled: _disabled, position: _position, ...rest } = existing;
      editor.upsertNode({
        ...rest,
        data: merged as AgentNode['data'],
        ...(pos ? { position: { x: pos.x as number, y: pos.y as number } } : {}),
        ...(runAfterIds.length ? { runAfter: runAfterIds } : {}),
        ...(isDisabled ? { disabled: true } : {}),
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

    case 'editor_set_agent_info': {
      const summary = 'Update agent info';
      const update: Partial<AgentInfo> = {};
      let workspaceName: string | undefined;

      if (args.name !== undefined) {
        if (typeof args.name !== 'string' || !args.name.trim()) return fail(summary, 'name must be a non-empty string');
        update.name = args.name.trim();
      }
      if (args.description !== undefined) {
        if (typeof args.description !== 'string') return fail(summary, 'description must be a string');
        update.description = args.description.trim();
      }
      if (args.workspace !== undefined) {
        if (typeof args.workspace !== 'string') return fail(summary, 'workspace must be a string');
        const query = args.workspace.trim();
        if (!query) {
          update.workspaceId = null;
        } else {
          const { workspaces } = await workspacesApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
          const match =
            workspaces.find((w) => w.id === query) ??
            workspaces.find((w) => w.name.toLowerCase() === query.toLowerCase());
          if (!match) {
            return fail(summary, `workspace "${query}" not found, available: ${workspaces.map((w) => w.name).join(', ') || 'none'}`);
          }
          update.workspaceId = match.id;
          workspaceName = match.name;
        }
      }
      if (!Object.keys(update).length) return fail(summary, 'nothing to update - send name, description or workspace');

      if (!(await editor.updateAgentInfo(update))) return fail(summary, 'update failed');
      return { summary, result: { ok: true, agent: { ...editor.getAgentInfo(), ...update, workspaceName } } };
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
