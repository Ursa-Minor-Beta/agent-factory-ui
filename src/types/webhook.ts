export interface Webhook {
  id: string;
  agentId: string;
  agentName?: string; // included in list responses
  workspaceId?: string | null; // agent's workspace, in list responses
  workspaceName?: string | null;
  name: string;
  url: string; // full public trigger URL
  enabled: boolean;
  handler: string | null; // JS source; null or "" = no handler
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookTemplate {
  id: string; // 'slack' | 'github' | 'telegram'
  name: string;
  description: string;
  requiredSecrets: string[];
  code: string;
}

export interface WebhookTestInput {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
}

export interface WebhookTestResult {
  result: {
    run?: { input: Record<string, unknown> };
    response?: { status?: number; headers?: Record<string, string>; body?: unknown };
    dedupeKey?: string;
  } | null;
  logs: { level: 'log' | 'warn' | 'error'; message: string }[];
  error?: string;
}
