import { api, fetchWithRefresh, ApiError } from './client';
import type { Agent, AgentGraph, AgentQueryParams, AgentListResponse, EditorData, AgentNode, AgentExportData, AgentImportRequest, AgentImportResponse } from '../types';

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

// Per-scope caches for the relations graph (a workspace id, or ALL_AGENTS). In-memory: survive in-app
// navigation, cleared on page reload and by every agent mutation below.
/** Cache/graph scope for all of the user's agents across workspaces */
export const ALL_AGENTS = '*';

const graphCache = new Map<string, AgentGraph>();
const allAgentsCache = new Map<string, Agent[]>();

export function clearAgentsCache() {
  graphCache.clear();
  allAgentsCache.clear();
}

// Run a mutation and drop cached agents once it succeeds
async function mutating<T>(request: Promise<T>): Promise<T> {
  const result = await request;
  clearAgentsCache();
  return result;
}

async function fetchAll(scope: string): Promise<Agent[]> {
  const workspaceId = scope === ALL_AGENTS ? undefined : scope;
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
  return listed;
}

async function fetchGraph(scope: string): Promise<AgentGraph> {
  const response = await fetchWithRefresh(
    scope === ALL_AGENTS ? '/api/agents/graph' : `/api/workspaces/${scope}/agent-graph`
  );
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data.error?.code || 'UNKNOWN_ERROR', data.error?.message || 'An error occurred');
  }
  return data;
}

// Cached fetch: peek() reads the cache synchronously, fetch() always hits the API and refreshes it
function cached<T>(cache: Map<string, T>, load: (scope: string) => Promise<T>) {
  return {
    peek: (scope: string) => cache.get(scope),
    fetch: async (scope: string) => {
      const value = await load(scope);
      cache.set(scope, value);
      return value;
    },
  };
}

export const agentsApi = {
  list: (params: AgentQueryParams = {}) =>
    api.get<AgentListResponse>(`/api/agents${buildQueryString(params)}`),

  getById: (id: string) =>
    api.get<Agent>(`/api/agents/${id}`),

  // Relation graph of a workspace's agents (or ALL_AGENTS), cached until the next agent mutation
  graph: cached(graphCache, fetchGraph),

  // All agents of a workspace or ALL_AGENTS (list fields, no nodes), cached until the next agent mutation
  listAll: cached(allAgentsCache, fetchAll),

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
