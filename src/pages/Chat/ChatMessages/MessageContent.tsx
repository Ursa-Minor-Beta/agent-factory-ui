import { useMemo } from 'react';
import { Box } from '@mantine/core';
import { CollapsibleContent } from './CollapsibleContent';
import { AttachmentPreview } from './AttachmentPreview';
import { FileRefPreview } from './FileContent';
import type { MessageAttachment, FileRef } from '../types';
import { extractInnerFileRefs } from '../../../types';
import { guessMimeType } from '../../../components/RunDetailsModal';

// Extract text from nested node output structure like {"output-1":{"output-1":"text"}}
function extractNodeOutput(data: Record<string, unknown>): Record<string, unknown> | string {
  const keys = Object.keys(data);
  if (keys.length === 1) {
    const value = data[keys[0]];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const innerKeys = Object.keys(value as Record<string, unknown>);
      if (innerKeys.length === 1) {
        const innerValue = (value as Record<string, unknown>)[innerKeys[0]];
        if (typeof innerValue === 'string') {
          return innerValue;
        }
        if (typeof innerValue === 'object' && innerValue !== null) {
          return extractNodeOutput(innerValue as Record<string, unknown>);
        }
      }
    }
    if (typeof value === 'string') {
      return value;
    }
  }
  return data;
}

// Helper to format field name as readable label
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// Helper to stringify a value (handles nested objects)
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
  }
  return String(value);
}

interface ParsedContent {
  text: string;
  fileRefs: FileRef[];
}

// Parse response content - extracts text and file references
export function parseResponseContent(response: unknown): ParsedContent {
  const fileRefs: FileRef[] = [];
  const seenIds = new Set<string>();

  // Parse JSON string if needed
  let data: unknown = response;
  if (typeof response === 'string') {
    try {
      data = JSON.parse(response);
    } catch {
      // Not JSON, use as-is
    }
  }

  // Try to extract meaningful content from nested node output
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    data = extractNodeOutput(data as Record<string, unknown>);
  }

  // Extract {{inner:...}} file refs from text and clean them
  const extractAndCleanFileRefs = (str: string, fieldName: string): string => {
    // Extract embedded JSON with file refs like: {"screenshot":"{{inner:...}}"}
    const embeddedJsonRegex = /\s*\{[^{}]*"([^"]+)"\s*:\s*"\{\{inner:([a-f0-9]+)\}\}"[^{}]*\}/g;
    let match: RegExpExecArray | null;

    while ((match = embeddedJsonRegex.exec(str)) !== null) {
      const field = match[1];
      const fileId = match[2];
      if (!seenIds.has(fileId)) {
        seenIds.add(fileId);
        fileRefs.push({
          index: fileRefs.length,
          fileId,
          mimeType: guessMimeType(field),
          fieldName: field,
        });
      }
    }
    str = str.replace(embeddedJsonRegex, '');

    // Extract standalone {{inner:...}} patterns
    const standaloneRegex = /\{\{inner:([a-f0-9]+)\}\}/g;
    while ((match = standaloneRegex.exec(str)) !== null) {
      const fileId = match[1];
      if (!seenIds.has(fileId)) {
        seenIds.add(fileId);
        fileRefs.push({
          index: fileRefs.length,
          fileId,
          mimeType: guessMimeType(fieldName),
          fieldName,
        });
      }
    }
    return str.replace(standaloneRegex, '').trim();
  };

  // If data is now a simple string, extract file refs and return
  if (typeof data === 'string') {
    const text = extractAndCleanFileRefs(data, 'file');
    return { text, fileRefs };
  }

  // Handle object with multiple fields - format nicely
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const textParts: string[] = [];

    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        // Check if value is a file ref
        if (value.match(/^\{\{inner:[a-f0-9]+\}\}$/)) {
          const match = value.match(/\{\{inner:([a-f0-9]+)\}\}/);
          if (match && !seenIds.has(match[1])) {
            seenIds.add(match[1]);
            fileRefs.push({
              index: fileRefs.length,
              fileId: match[1],
              mimeType: guessMimeType(key),
              fieldName: key,
            });
          }
          continue; // Skip adding to text
        }
        // Check if value contains file refs
        const cleaned = extractAndCleanFileRefs(value, key);
        if (cleaned) {
          if (entries.length === 1) {
            textParts.push(cleaned);
          } else {
            textParts.push(`**${formatLabel(key)}**\n${cleaned}`);
          }
        }
      } else if (value !== null && value !== undefined) {
        // Non-string value, check for nested file refs using old format
        const innerRefs = extractInnerFileRefs(value);
        for (const ref of innerRefs) {
          if (!seenIds.has(ref.fileId)) {
            seenIds.add(ref.fileId);
            fileRefs.push({
              index: fileRefs.length,
              fileId: ref.fileId,
              mimeType: guessMimeType(ref.fieldName),
              fieldName: ref.path || ref.fieldName,
            });
          }
        }
        // Only add non-empty objects to text
        if (typeof value === 'object' && Object.keys(value as object).length === 0) {
          continue;
        }
        textParts.push(`**${formatLabel(key)}**\n${stringifyValue(value)}`);
      }
    }

    return { text: textParts.join('\n\n'), fileRefs };
  }

  // Fallback for other types
  return { text: String(data ?? ''), fileRefs: [] };
}

interface MessageContentProps {
  /** Raw content - can be string, JSON string, or object */
  content: unknown;
  /** User attachments (images uploaded by user) */
  attachments?: MessageAttachment[];
  /** Pre-parsed file refs (if already parsed) */
  fileRefs?: FileRef[];
}

/**
 * Reusable component for displaying message content with markdown, attachments, and file refs.
 * Handles parsing of raw response content to extract file references.
 */
export function MessageContent({ content, attachments, fileRefs: providedFileRefs }: MessageContentProps) {
  // Parse content if needed
  const { text, fileRefs: parsedFileRefs } = useMemo(() => {
    // If content is already a plain string without file refs, skip parsing
    if (typeof content === 'string' && !content.includes('{{inner:') && !content.startsWith('{')) {
      return { text: content, fileRefs: [] };
    }
    return parseResponseContent(content);
  }, [content]);

  // Merge provided fileRefs with parsed ones
  const allFileRefs = providedFileRefs || parsedFileRefs;

  return (
    <>
      {text && <CollapsibleContent content={text} />}
      {attachments && attachments.length > 0 && (
        <Box mt={text ? 'sm' : 0}>
          <AttachmentPreview attachments={attachments} />
        </Box>
      )}
      {allFileRefs && allFileRefs.length > 0 && (
        <Box mt={text || attachments ? 'sm' : 0}>
          <FileRefPreview fileRefs={allFileRefs} />
        </Box>
      )}
    </>
  );
}
