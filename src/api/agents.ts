import { api } from './client';
import type { Agent, AgentQueryParams, AgentListResponse, EditorData, AgentNode, AgentExportData, AgentImportRequest, AgentImportResponse } from '../types';

export interface AgentExample {
  name: string;
  description: string;
  nodes: AgentNode[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  nodes?: Agent['nodes'];
  editorData?: EditorData;
  workspaceId?: string | null;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  nodes?: Agent['nodes'];
  editorData?: EditorData;
  status?: 'draft' | 'published';
  workspaceId?: string | null;
}

function buildQueryString(params: AgentQueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

const PAGE_SIZE = 100; // backend max for list

// Full agents (with nodes) per workspace for the relations graph. In-memory: survives in-app
// navigation, cleared on page reload and by every agent mutation below.
const fullAgentsCache = new Map<string, Agent[]>();

export function clearAgentsCache() {
  fullAgentsCache.clear();
}

// Run a mutation and drop cached agents once it succeeds
async function mutating<T>(request: Promise<T>): Promise<T> {
  const result = await request;
  clearAgentsCache();
  return result;
}

async function fetchAllWithNodes(workspaceId?: string): Promise<Agent[]> {
  const listed: Agent[] = [];
  let total = Infinity;
  while (listed.length < total) {
    const page = await api.get<AgentListResponse>(
      `/api/agents${buildQueryString({ workspaceId, skip: listed.length, limit: PAGE_SIZE })}`
    );
    listed.push(...page.agents);
    total = page.total;
    if (page.agents.length === 0) break;
  }
  // List omits nodes, so fetch each agent's definition; keep list fields (workspaceName, nodesCount)
  return Promise.all(listed.map(async (a) => ({ ...a, nodes: (await api.get<Agent>(`/api/agents/${a.id}`)).nodes })));
}

export const agentsApi = {
  list: (params: AgentQueryParams = {}) =>
    api.get<AgentListResponse>(`/api/agents${buildQueryString(params)}`),

  getById: (id: string) =>
    api.get<Agent>(`/api/agents/${id}`),

  // All agents of a workspace including nodes, cached until the next agent mutation
  listAllWithNodes: {
    peek: (workspaceId?: string) => fullAgentsCache.get(workspaceId ?? ''),
    fetch: async (workspaceId?: string) => {
      const agents = await fetchAllWithNodes(workspaceId);
      fullAgentsCache.set(workspaceId ?? '', agents);
      return agents;
    },
  },

  create: (data: CreateAgentInput) =>
    mutating(api.post<Agent>('/api/agents', data)),

  update: (id: string, data: UpdateAgentInput) =>
    mutating(api.put<Agent>(`/api/agents/${id}`, data)),

  delete: (id: string) =>
    mutating(api.delete<void>(`/api/agents/${id}`)),

  validate: (id: string) =>
    api.post<{ valid: boolean; errors: string[] }>(`/api/agents/${id}/validate`),

  getExamples: () =>
    api.get<AgentExample[]>('/api/agents/examples'),

  export: (id: string) =>
    api.get<AgentExportData>(`/api/agents/${id}/export`),

  import: (data: AgentImportRequest) =>
    mutating(api.post<AgentImportResponse>('/api/agents/import', data)),
};
