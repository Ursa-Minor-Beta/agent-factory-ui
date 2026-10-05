export type MemoryFieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface MemorySchemaField {
  name: string;
  type: MemoryFieldType;
  required?: boolean;
  index?: boolean;
  description?: string;
  default?: unknown;
  items?: MemoryFieldType; // For array type
}

export interface MemorySchema {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  fields: MemorySchemaField[];
  enableEmbeddings: boolean;
  embeddingField?: string | null;
  workspaceId?: string | null;
  workspaceName?: string;
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
}

// System fields that are read-only and should not be edited
export const MEMORY_RESERVED_FIELDS = ['id', 'schemaId', 'createdAt', 'updatedAt'] as const;

// Base system fields for a memory record
export interface MemoryRecordBase {
  id: string;
  schemaId: string;
  createdAt: string;
  updatedAt: string;
}

// Full memory record with user fields at root level (not nested under data)
export type MemoryRecord = MemoryRecordBase & Record<string, unknown>;

// Helper to extract user fields from a record (excluding system fields)
export function getRecordUserFields(record: MemoryRecord): Record<string, unknown> {
  const userFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!MEMORY_RESERVED_FIELDS.includes(key as (typeof MEMORY_RESERVED_FIELDS)[number])) {
      userFields[key] = value;
    }
  }
  return userFields;
}

export interface MemorySearchResult {
  record: MemoryRecord;
  score: number;
}
