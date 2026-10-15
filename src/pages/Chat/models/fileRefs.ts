import { guessMimeType } from '../../../components/RunDetailsModal';
import type { FileRef } from '../types';

/**
 * Check if string is an inner file reference
 * Supports both old format (inner:<fileId>) and new format ({{inner:<fileId>}})
 */
export function isInnerFileRef(str: string): boolean {
  if (typeof str !== 'string') return false;
  return str.startsWith('inner:') || /\{\{inner:[a-f0-9]+\}\}/.test(str);
}

/**
 * Parse inner file reference to FileRef
 * Supports: "inner:<fileId>:<fieldName>" or "{{inner:<fileId>}}"
 */
export function parseInnerRef(str: string, fieldName: string): FileRef | null {
  if (!isInnerFileRef(str)) return null;

  // New format: {{inner:<fileId>}}
  const newMatch = str.match(/^\{\{inner:([a-f0-9]+)\}\}$/);
  if (newMatch) {
    return { index: 0, fileId: newMatch[1], fieldName, mimeType: guessMimeType(fieldName) };
  }

  // Old format: inner:<fileId>:<fieldName>
  const parts = str.split(':');
  if (parts.length < 2) return null;
  const fileId = parts[1];
  const refFieldName = parts.slice(2).join(':') || fieldName;
  return { index: 0, fileId, fieldName: refFieldName, mimeType: guessMimeType(fieldName) };
}

/**
 * Extract inner file refs from object recursively
 */
export function extractFileRefs(
  data: Record<string, unknown>,
  fileRefs: FileRef[],
  prefix = ''
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' && isInnerFileRef(value)) {
      const ref = parseInnerRef(value, fullKey);
      if (ref) {
        ref.index = fileRefs.length;
        fileRefs.push(ref);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedFileRefs: FileRef[] = [];
      const cleanedNested = extractFileRefs(value as Record<string, unknown>, nestedFileRefs, fullKey);
      nestedFileRefs.forEach((ref) => {
        ref.index = fileRefs.length;
        fileRefs.push(ref);
      });
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (Array.isArray(value)) {
      const cleanedArray: unknown[] = [];
      value.forEach((item, index) => {
        if (typeof item === 'string' && isInnerFileRef(item)) {
          const ref = parseInnerRef(item, `${fullKey}[${index}]`);
          if (ref) {
            ref.index = fileRefs.length;
            fileRefs.push(ref);
          }
        } else if (typeof item === 'object' && item !== null) {
          const nestedFileRefs: FileRef[] = [];
          const cleanedItem = extractFileRefs(
            item as Record<string, unknown>,
            nestedFileRefs,
            `${fullKey}[${index}]`
          );
          nestedFileRefs.forEach((ref) => {
            ref.index = fileRefs.length;
            fileRefs.push(ref);
          });
          if (Object.keys(cleanedItem).length > 0) {
            cleanedArray.push(cleanedItem);
          }
        } else {
          cleanedArray.push(item);
        }
      });
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Extract {{inner:...}} file refs from a string and clean up the text
 */
export function extractFileRefsFromString(text: string): { cleanedText: string; fileRefs: FileRef[] } {
  const fileRefs: FileRef[] = [];
  let cleanedText = text;

  // First, try to extract and remove embedded JSON with file refs like: {"screenshot":"{{inner:...}}"}
  const embeddedJsonRegex = /\s*\{[^{}]*"([^"]+)"\s*:\s*"\{\{inner:([a-f0-9]+)\}\}"[^{}]*\}/g;
  let jsonMatch: RegExpExecArray | null;

  while ((jsonMatch = embeddedJsonRegex.exec(text)) !== null) {
    const fieldName = jsonMatch[1];
    const fileId = jsonMatch[2];
    fileRefs.push({
      index: fileRefs.length,
      fileId,
      fieldName,
      mimeType: guessMimeType(fieldName),
    });
  }

  // Remove embedded JSON blocks with file refs
  cleanedText = cleanedText.replace(embeddedJsonRegex, '');

  // Also handle standalone {{inner:...}} patterns (without JSON wrapper)
  const standaloneRegex = /\{\{inner:([a-f0-9]+)\}\}/g;
  let standaloneMatch: RegExpExecArray | null;
  const seenIds = new Set(fileRefs.map((r) => r.fileId));

  while ((standaloneMatch = standaloneRegex.exec(text)) !== null) {
    const fileId = standaloneMatch[1];
    if (!seenIds.has(fileId)) {
      seenIds.add(fileId);
      fileRefs.push({
        index: fileRefs.length,
        fileId,
        fieldName: 'file',
        mimeType: 'application/octet-stream',
      });
    }
  }

  // Remove any remaining standalone placeholders
  cleanedText = cleanedText.replace(standaloneRegex, '');

  // Clean up trailing/leading whitespace and periods followed by nothing
  cleanedText = cleanedText.replace(/\.\s*$/, '.').trim();

  return { cleanedText, fileRefs };
}

/**
 * Parse file references from message.files array
 * Supports both old format "inner:<fileId>:<fieldName>" and new format "{{inner:<fileId>}}"
 */
export function parseFileReferences(files: string[] | undefined, content: string): FileRef[] {
  if (!files || files.length === 0) return [];

  const fileRefs: FileRef[] = [];
  const seenFileIds = new Set<string>();

  // First, try old format: match placeholders like [file:0:image/png] in content
  const oldPlaceholderRegex = /\[file:(\d+):([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = oldPlaceholderRegex.exec(content)) !== null) {
    const index = parseInt(match[1], 10);
    const mimeType = match[2];

    if (index < files.length) {
      const fileRef = files[index];
      // Parse "inner:<fileId>:<fieldName>"
      const parts = fileRef.split(':');
      if (parts.length >= 2) {
        const fileId = parts[1];
        if (!seenFileIds.has(fileId)) {
          seenFileIds.add(fileId);
          const fieldName = parts.slice(2).join(':');
          fileRefs.push({ index: fileRefs.length, fileId, fieldName, mimeType });
        }
      }
    }
  }

  // New format: files array contains "{{inner:<fileId>}}"
  files.forEach((fileEntry) => {
    const newMatch = fileEntry.match(/^\{\{inner:([a-f0-9]+)\}\}$/);
    if (newMatch) {
      const fileId = newMatch[1];
      if (!seenFileIds.has(fileId)) {
        seenFileIds.add(fileId);
        // Try to find field name from content JSON structure
        const fieldPattern = new RegExp(`"([^"]+)"\\s*:\\s*"\\{\\{inner:${fileId}\\}\\}"`, 'i');
        const fieldMatch = content.match(fieldPattern);
        const fieldName = fieldMatch ? fieldMatch[1] : 'file';
        fileRefs.push({
          index: fileRefs.length,
          fileId,
          fieldName,
          mimeType: guessMimeType(fieldName),
        });
      }
    }
  });

  return fileRefs;
}
