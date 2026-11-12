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

export interface FileListResponse {
  files: FileListItem[];
  total: number;
}

export type FilesSortBy = 'name' | 'size' | 'mimeType' | 'createdAt';

export interface ListFilesParams {
  limit?: number;
  offset?: number;
  /** Contains, case-insensitive */
  name?: string;
  /** MIME type prefix, case-insensitive (e.g. 'image' or 'application/pdf') */
  mimeType?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: FilesSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface DeleteFilesParams {
  id: string | string[];
}

export interface DeleteFilesResponse {
  deletedCount: number;
}

export const filesApi = {
  list: (params: ListFilesParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return api.get<FileListResponse>(`/api/files${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<FileData>(`/api/files/${id}`),

  delete: (params: DeleteFilesParams) =>
    api.post<DeleteFilesResponse>('/api/files/delete', params),
};
