import { api } from './client';
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
  pullAgent: (agentId: string, data?: GitHubPullRequest): Promise<GitHubPullResponse> =>
    api.post(`/api/agents/${agentId}/github/pull`, data),

  // Import a new agent from GitHub
  importAgent: (data: GitHubImportRequest): Promise<GitHubImportResponse> =>
    api.post('/api/agents/github/import', data),

  // List commits for an agent's linked repository
  listAgentCommits: (agentId: string): Promise<GitHubCommit[]> =>
    api.get(`/api/agents/${agentId}/github/commits`),
};
