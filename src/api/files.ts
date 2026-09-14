import { api } from './client';

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export const filesApi = {
  getById: (id: string) =>
    api.get<FileData>(`/api/files/${id}`),

  delete: (id: string) =>
    api.delete<void>(`/api/files/${id}`),
};
