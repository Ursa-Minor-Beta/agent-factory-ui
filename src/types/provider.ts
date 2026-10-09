export interface ProviderConfig {
  id: string;
  userId: string;
  provider: 'openai' | 'anthropic' | 'ollama';
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
