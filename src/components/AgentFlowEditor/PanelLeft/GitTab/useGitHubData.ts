import { useEffect, useState } from 'react';
import { api } from '../../../../api/client';
import type { Agent } from '../../../../types/agent';

interface GitHubSync {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  providerName: string;
  publicRepo: boolean;
  repository: string;
  branch: string;
  path: string;
  status: string;
  lastCommitSha: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface UseGitHubDataResult {
  syncStatus: GitHubSync | null;
  commits: GitHubCommit[];
  loading: boolean;
  loadingCommits: boolean;
  error: string | null;
  commitsError: string | null;
  refresh: () => void;
}

// Module-level cache that persists across component mount/unmount
const cache = new Map<string, { syncStatus: GitHubSync; commits: GitHubCommit[] }>();

// Export function to clear cache from outside the hook
export function clearGitHubCache(agentId: string) {
  cache.delete(agentId);
}

export function useGitHubData(agent: Partial<Agent> | null): UseGitHubDataResult {
  const [syncStatus, setSyncStatus] = useState<GitHubSync | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitsError, setCommitsError] = useState<string | null>(null);

  const agentId = agent?.id;
  const isSubAgent = agent?.github?.rootId && agent.github.rootId !== agent.id;
  // For sub-agents, use the root agent's ID for sync status
  const syncAgentId = isSubAgent ? agent?.github?.rootId : agentId;

  useEffect(() => {
    if (!syncAgentId) {
      setSyncStatus(null);
      setCommits([]);
      return;
    }

    // Check if we have cached data for this agent
    const cached = cache.get(syncAgentId);
    if (cached) {
      setSyncStatus(cached.syncStatus);
      setCommits(cached.commits);
      return;
    }

    // No cache, fetch data
    loadGitHubStatus();
  }, [syncAgentId]);

  const loadGitHubStatus = async () => {
    if (!syncAgentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<GitHubSync | null>(`/api/agents/${syncAgentId}/github`);

      if (response) {
        setSyncStatus(response);

        // Load commits if agent is linked
        const commitsData = await loadCommits();

        // Cache the data
        cache.set(syncAgentId, {
          syncStatus: response,
          commits: commitsData,
        });
      } 
      else {
        setSyncStatus(null);
        setCommits([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub status');
    } finally {
      setLoading(false);
    }
  };

  const loadCommits = async (): Promise<GitHubCommit[]> => {
    if (!syncAgentId) return [];

    setLoadingCommits(true);
    setCommitsError(null);

    try {
      const response = await api.get<GitHubCommit[]>(`/api/agents/${syncAgentId}/github/commits`);
      setCommits(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load commits';
      setCommitsError(message);
      setCommits([]);
      return [];
    } finally {
      setLoadingCommits(false);
    }
  };

  const refresh = () => {
    if (syncAgentId) {
      cache.delete(syncAgentId);
      loadGitHubStatus();
    }
  };

  return {
    syncStatus,
    commits,
    loading,
    loadingCommits,
    error,
    commitsError,
    refresh,
  };
}
