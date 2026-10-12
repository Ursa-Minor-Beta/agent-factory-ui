export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'github';

export interface ProviderOption {
  value: ProviderType;
  label: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'github', label: 'GitHub' },
];

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
