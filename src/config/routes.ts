/**
 * Single source of truth for app URLs.
 * Always build links/navigation via these helpers — never hardcode paths.
 */
export const routes = {
  home: () => '/',
  login: (redirect?: string) =>
    redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login',

  agents: () => '/agents',
  agentChat: (agentId: string, sessionId?: string) =>
    sessionId ? `/agents/${agentId}/chat/${sessionId}` : `/agents/${agentId}/chat`,
  agentEditor: (agentId: string) => `/agents/${agentId}/editor`,
  newAgentEditor: (workspaceId?: string) =>
    workspaceId ? `/agents/new/editor?workspaceId=${workspaceId}` : '/agents/new/editor',

  workspaces: () => '/workspaces',
  workspaceCreate: () => '/workspaces?create=true',
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,

  configurations: () => '/configurations',
  providers: () => '/configurations/providers',
  secrets: () => '/configurations/secrets',
  collections: () => '/configurations/collections',
  collectionRecords: (collectionId: string) => `/configurations/collections/${collectionId}/records`,

  monitoring: () => '/monitoring',
  sessions: () => '/monitoring/sessions',
  runs: () => '/monitoring/runs',
  files: () => '/monitoring/files',

  settings: () => '/settings',
  settingsSystem: () => '/settings/system',
  settingsUsers: () => '/settings/users',
  settingsApiKeys: () => '/settings/api-keys',
} as const;
