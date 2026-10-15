import type { FileRef } from '../types';
import { extractFileRefs } from './fileRefs';

/**
 * Format field name as readable label
 */
export function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * Stringify a value (handles nested objects)
 */
export function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Wrap JSON in markdown code block for proper formatting
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
  }
  return String(value);
}

/**
 * Format input/output object for display (returns text and file refs)
 */
export function formatContentWithFileRefs(data: Record<string, unknown>): {
  text: string;
  fileRefs: FileRef[];
} {
  const fileRefs: FileRef[] = [];
  const cleaned = extractFileRefs(data, fileRefs);

  const entries = Object.entries(cleaned);
  let text = '';
  if (entries.length === 1) {
    text = stringifyValue(entries[0][1]);
  } else if (entries.length > 1) {
    text = entries
      .map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`)
      .join('\n\n&nbsp;\n\n');
  }

  return { text, fileRefs };
}

/**
 * Format user input for display (no attachment extraction needed)
 */
export function formatContent(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return '';
  if (entries.length === 1) return stringifyValue(entries[0][1]);
  return entries
    .map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`)
    .join('\n\n&nbsp;\n\n');
}

/**
 * Extract text from nested node output structure like {"output-1":{"output-1":"text"}}
 */
export function extractNodeOutput(data: Record<string, unknown>): Record<string, unknown> | string {
  const keys = Object.keys(data);

  // If single key and value is an object with a single string value, unwrap it
  if (keys.length === 1) {
    const value = data[keys[0]];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const innerKeys = Object.keys(value as Record<string, unknown>);
      if (innerKeys.length === 1) {
        const innerValue = (value as Record<string, unknown>)[innerKeys[0]];
        // If the inner value is a string, return it directly
        if (typeof innerValue === 'string') {
          return innerValue;
        }
        // If it's another object, recursively extract
        if (typeof innerValue === 'object' && innerValue !== null) {
          return extractNodeOutput(innerValue as Record<string, unknown>);
        }
      }
    }
    // Single key with string value
    if (typeof value === 'string') {
      return value;
    }
  }

  // Return as-is for complex structures
  return data;
}
