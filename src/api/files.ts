import { api } from './client';

// File metadata (without data)
export interface FileListItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// Full file data (with base64 content)
export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export const filesApi = {
  list: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return api.get<FileListItem[]>(`/api/files${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<FileData>(`/api/files/${id}`),

  delete: (id: string) =>
    api.delete<void>(`/api/files/${id}`),
};
