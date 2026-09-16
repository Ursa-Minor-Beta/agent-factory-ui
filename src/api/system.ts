import { api, fetchWithRefresh } from './client';

export interface ApiInfo {
  name: string;
  version: string;
}

export interface HealthCheck {
  status: string;
  timestamp: string;
}

export interface ReseedResult {
  updated: string[];
  created: string[];
}

export const systemApi = {
  getApiInfo: async (): Promise<ApiInfo> => {
    const response = await fetchWithRefresh('/api');
    return response.json();
  },

  getHealth: async (): Promise<HealthCheck> => {
    const response = await fetchWithRefresh('/health');
    return response.json();
  },

  reseedSystemAgents: () => api.post<ReseedResult>('/api/agents/system/reseed'),
};
