import { useEffect, useState } from 'react';
import { api } from '../../../../api/client';

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
  refresh: () => void;
}

// Module-level cache that persists across component mount/unmount
const cache = new Map<string, { syncStatus: GitHubSync; commits: GitHubCommit[] }>();

export function useGitHubData(agentId: string | undefined): UseGitHubDataResult {
  const [syncStatus, setSyncStatus] = useState<GitHubSync | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setSyncStatus(null);
      setCommits([]);
      return;
    }

    // Check if we have cached data for this agent
    const cached = cache.get(agentId);
    if (cached) {
      setSyncStatus(cached.syncStatus);
      setCommits(cached.commits);
      return;
    }

    // No cache, fetch data
    loadGitHubStatus();
  }, [agentId]);

  const loadGitHubStatus = async () => {
    if (!agentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<GitHubSync | null>(`/api/agents/${agentId}/github`);

      if (response) {
        setSyncStatus(response);

        // Load commits if agent is linked
        const commitsData = await loadCommits();

        // Cache the data
        cache.set(agentId, {
          syncStatus: response,
          commits: commitsData,
        });
      } else {
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
    if (!agentId) return [];

    setLoadingCommits(true);

    try {
      const response = await api.get<GitHubCommit[]>(`/api/agents/${agentId}/github/commits`);
      setCommits(response);
      return response;
    } catch (err) {
      console.error('Failed to load commits:', err);
      setCommits([]);
      return [];
    } finally {
      setLoadingCommits(false);
    }
  };

  const refresh = () => {
    if (agentId) {
      cache.delete(agentId);
      loadGitHubStatus();
    }
  };

  return {
    syncStatus,
    commits,
    loading,
    loadingCommits,
    error,
    refresh,
  };
}
