import { api } from './client';
import type { MemorySchema, MemoryRecord, MemorySchemaField, MemorySearchResult } from '../types';

// Schema DTOs
export interface CreateMemorySchemaInput {
  name: string;
  description?: string;
  fields: MemorySchemaField[];
  enableEmbeddings?: boolean;
  embeddingField?: string;
  workspaceId?: string;
}

export interface UpdateMemorySchemaInput {
  name?: string;
  description?: string;
  fields?: MemorySchemaField[];
  enableEmbeddings?: boolean;
  embeddingField?: string;
  workspaceId?: string | null;
}

// Record DTOs - user fields are sent flat at root level (not nested under data)
export type CreateMemoryRecordInput = Record<string, unknown>;
export type UpdateMemoryRecordInput = Record<string, unknown>;

// Search options
export interface MemorySearchOptions {
  query?: string;
  filters?: Record<string, unknown>;
  tags?: string[];
  minImportance?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

// List options for schemas
export interface ListSchemasOptions {
  limit?: number;
  offset?: number;
  search?: string;
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
}

// List options for records
export interface ListRecordsOptions {
  limit?: number;
  offset?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

// Paginated records response
export interface ListRecordsResponse {
  records: MemoryRecord[];
  total: number;
}

export const memoryApi = {
  // Schema operations
  listSchemas: (options?: ListSchemasOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.search) params.append('search', options.search);
    if (options?.workspaceId !== undefined) {
      params.append('workspaceId', options.workspaceId === null ? 'null' : options.workspaceId);
    }
    const query = params.toString();
    return api.get<MemorySchema[]>(`/api/memory/schemas${query ? `?${query}` : ''}`);
  },

  getSchema: (id: string) =>
    api.get<MemorySchema>(`/api/memory/schemas/${id}`),

  createSchema: (data: CreateMemorySchemaInput) =>
    api.post<MemorySchema>('/api/memory/schemas', data),

  updateSchema: (id: string, data: UpdateMemorySchemaInput) =>
    api.patch<MemorySchema>(`/api/memory/schemas/${id}`, data),

  deleteSchema: (id: string) =>
    api.delete<{ deletedRecords: number }>(`/api/memory/schemas/${id}`),

  // Record operations
  listRecords: (collectionId: string, options?: ListRecordsOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.sortField) params.append('sortField', options.sortField);
    if (options?.sortDirection) params.append('sortDirection', options.sortDirection);
    if (options?.search) params.append('search', options.search);
    const query = params.toString();
    return api.get<ListRecordsResponse>(`/api/memory/${collectionId}/records${query ? `?${query}` : ''}`);
  },

  getRecord: (collectionId: string, id: string) =>
    api.get<MemoryRecord>(`/api/memory/${collectionId}/records/${id}`),

  createRecord: (collectionId: string, data: CreateMemoryRecordInput) =>
    api.post<MemoryRecord>(`/api/memory/${collectionId}/records`, data),

  updateRecord: (collectionId: string, id: string, data: UpdateMemoryRecordInput) =>
    api.patch<MemoryRecord>(`/api/memory/${collectionId}/records/${id}`, data),

  deleteRecord: (collectionId: string, id: string) =>
    api.delete<void>(`/api/memory/${collectionId}/records/${id}`),

  searchRecords: (collectionId: string, options: MemorySearchOptions) =>
    api.post<MemorySearchResult[]>(`/api/memory/${collectionId}/search`, options),

  countRecords: (collectionId: string, filters?: Record<string, unknown>) =>
    api.post<{ count: number }>(`/api/memory/${collectionId}/count`, { filters }),
};
