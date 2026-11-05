// Known provider types; presets come from the backend, so any string is accepted
export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'github' | (string & {});

export type ProviderKind = 'llm' | 'integration' | (string & {});

export interface ProviderPreset {
  provider: ProviderType;
  kind: ProviderKind;
  label: string;
  protocol: string;
  defaultBaseUrl: string | null;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
}

export interface ProviderConfig {
  id: string;
  userId: string;
  provider: ProviderType;
  name: string;
  isDefault: boolean;
  config: {
    apiKey?: string;
    baseUrl?: string;
  };
  workspaceId?: string | null;
  workspaceName?: string;
  createdAt: string;
  updatedAt: string;
}
