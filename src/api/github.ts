import { api } from './client';
import { clearAgentsCache } from './agents';
import type {
  GitHubSync,
  GitHubCommit,
  GitHubLinkRequest,
  GitHubImportRequest,
  GitHubImportResponse,
  GitHubPushRequest,
  GitHubPushResponse,
  GitHubPullRequest,
  GitHubPullResponse,
  GitHubUpdateSettingsRequest,
} from '../types/github';

export const githubApi = {
  // Link an agent to a GitHub repository
  linkAgent: (agentId: string, data: GitHubLinkRequest): Promise<GitHubSync> =>
    api.post(`/api/agents/${agentId}/github/link`, data),

  // Unlink an agent from GitHub
  unlinkAgent: (agentId: string): Promise<void> =>
    api.delete(`/api/agents/${agentId}/github/link`),

  // Get GitHub sync status for an agent
  getAgentStatus: (agentId: string): Promise<GitHubSync | null> =>
    api.get(`/api/agents/${agentId}/github`),

  // Push agent changes to GitHub
  pushAgent: (agentId: string, data?: GitHubPushRequest): Promise<GitHubPushResponse> =>
    api.post(`/api/agents/${agentId}/github/push`, data),

  // Pull agent changes from GitHub (updates existing agent)
  pullAgent: async (agentId: string, data?: GitHubPullRequest): Promise<GitHubPullResponse> => {
    const result = await api.post<GitHubPullResponse>(`/api/agents/${agentId}/github/pull`, data);
    clearAgentsCache(); // pulled nodes may change agent relations
    return result;
  },

  // Import a new agent from GitHub
  importAgent: async (data: GitHubImportRequest): Promise<GitHubImportResponse> => {
    const result = await api.post<GitHubImportResponse>('/api/agents/github/import', data);
    clearAgentsCache();
    return result;
  },

  // List commits for an agent's linked repository
  listAgentCommits: (agentId: string): Promise<GitHubCommit[]> =>
    api.get(`/api/agents/${agentId}/github/commits`),

  // Update GitHub sync settings
  updateSettings: (agentId: string, data: GitHubUpdateSettingsRequest): Promise<GitHubSync> =>
    api.put(`/api/agents/${agentId}/github`, data),
};
