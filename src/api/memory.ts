import { api } from './client';
import type { MemorySchema, MemoryRecord, MemorySchemaField, MemorySearchResult } from '../types';

// Schema DTOs
export interface CreateMemorySchemaInput {
  name: string;
  description?: string;
  fields: MemorySchemaField[];
  enableEmbeddings?: boolean;
  embeddingField?: string;
}

export interface UpdateMemorySchemaInput {
  name?: string;
  description?: string;
  fields?: MemorySchemaField[];
  enableEmbeddings?: boolean;
  embeddingField?: string;
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
}

// List options for records
export interface ListRecordsOptions {
  limit?: number;
  offset?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

export const memoryApi = {
  // Schema operations
  listSchemas: (options?: ListSchemasOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.search) params.append('search', options.search);
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
  listRecords: (collection: string, options?: ListRecordsOptions) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.sortField) params.append('sortField', options.sortField);
    if (options?.sortDirection) params.append('sortDirection', options.sortDirection);
    if (options?.search) params.append('search', options.search);
    const query = params.toString();
    return api.get<MemoryRecord[]>(`/api/memory/${collection}/records${query ? `?${query}` : ''}`);
  },

  getRecord: (collection: string, id: string) =>
    api.get<MemoryRecord>(`/api/memory/${collection}/records/${id}`),

  createRecord: (collection: string, data: CreateMemoryRecordInput) =>
    api.post<MemoryRecord>(`/api/memory/${collection}/records`, data),

  updateRecord: (collection: string, id: string, data: UpdateMemoryRecordInput) =>
    api.patch<MemoryRecord>(`/api/memory/${collection}/records/${id}`, data),

  deleteRecord: (collection: string, id: string) =>
    api.delete<void>(`/api/memory/${collection}/records/${id}`),

  searchRecords: (collection: string, options: MemorySearchOptions) =>
    api.post<MemorySearchResult[]>(`/api/memory/${collection}/search`, options),

  countRecords: (collection: string, filters?: Record<string, unknown>) =>
    api.post<{ count: number }>(`/api/memory/${collection}/count`, { filters }),
};
