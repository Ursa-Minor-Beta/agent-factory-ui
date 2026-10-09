import type { ImportCollectionSchema } from './agent';

// GitHub Sync entity types
export const GitHubSyncEntity = {
  AGENT: 'agent',
} as const;

export type GitHubSyncEntity = typeof GitHubSyncEntity[keyof typeof GitHubSyncEntity];

export const GitHubSyncStatus = {
  SYNCED: 'synced',
  LOCAL_AHEAD: 'local_ahead',
  REMOTE_AHEAD: 'remote_ahead',
  CONFLICT: 'conflict',
} as const;

export type GitHubSyncStatus = typeof GitHubSyncStatus[keyof typeof GitHubSyncStatus];

export interface GitHubSync {
  id: string;
  userId: string;
  entityType: GitHubSyncEntity;
  entityId: string;
  providerName: string;
  publicRepo: boolean;
  repository: string;
  branch: string;
  path: string;
  status: GitHubSyncStatus;
  lastCommitSha: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

// API request/response types
export interface GitHubLinkRequest {
  repository: string;
  branch?: string;
  path: string;
}

export interface GitHubImportRequest {
  providerName?: string;
  publicRepo?: boolean;
  repository: string;
  path: string;
  branch?: string;
  workspaceId?: string;
}

export interface GitHubImportResponse {
  agentId: string;
  workspaceId: string;
  workspaceName: string;
  agentIdMap: Record<string, string>;
  warnings: {
    missingSecrets?: string[];
    missingProviders?: string[];
    missingCollections?: ImportCollectionSchema[];
  };
  message: string;
}

export interface GitHubPushRequest {
  message?: string;
}

export interface GitHubPushResponse {
  commitSha: string;
  message: string;
}

export interface GitHubPullRequest {
  commitSha?: string;
}

export interface GitHubPullResponse {
  agentId: string;
  message: string;
}
