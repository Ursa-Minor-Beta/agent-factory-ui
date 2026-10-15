import type { ChatMessage, FileRef } from '../types';
import { extractFileRefsFromString, parseFileReferences } from './fileRefs';
import { extractNodeOutput, formatContentWithFileRefs } from './formatting';

/**
 * Parse JSON message content (handles both string and object input)
 */
export function parseMessageContent(content: unknown): { text: string; fileRefs: FileRef[] } {
  // If content is already an object, try to extract node output
  if (typeof content === 'object' && content !== null) {
    const extracted = extractNodeOutput(content as Record<string, unknown>);
    if (typeof extracted === 'string') {
      // Extract file refs from the string content
      const { cleanedText, fileRefs } = extractFileRefsFromString(extracted);
      return { text: cleanedText, fileRefs };
    }
    return formatContentWithFileRefs(extracted as Record<string, unknown>);
  }

  // If content is a string, try to parse as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        const extracted = extractNodeOutput(parsed);
        if (typeof extracted === 'string') {
          // Extract file refs from the string content
          const { cleanedText, fileRefs } = extractFileRefsFromString(extracted);
          return { text: cleanedText, fileRefs };
        }
        return formatContentWithFileRefs(extracted as Record<string, unknown>);
      }
    } catch {
      // Not JSON, but might still contain file refs
      const { cleanedText, fileRefs } = extractFileRefsFromString(content);
      return { text: cleanedText, fileRefs };
    }
    // Extract file refs from plain string content
    const { cleanedText, fileRefs } = extractFileRefsFromString(content);
    return { text: cleanedText, fileRefs };
  }

  // For other primitives, convert to string
  return { text: String(content ?? ''), fileRefs: [] };
}

/**
 * API message type from backend
 */
export interface ApiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  files?: string[];
  runId?: string;
  createdAt: string;
}

/**
 * Map API message to ChatMessage
 */
export function mapApiMessageToChatMessage(m: ApiMessage): ChatMessage {
  const { text, fileRefs: contentFileRefs } = parseMessageContent(m.content);
  const messageFileRefs = parseFileReferences(m.files, typeof m.content === 'string' ? m.content : text);

  // Merge file refs from content and message.files array
  const allFileRefs = [...contentFileRefs, ...messageFileRefs];

  // For user messages, try to parse the original JSON to get rawInput
  let rawInput: Record<string, unknown> | undefined;
  if (m.role === 'user' && typeof m.content === 'string') {
    try {
      const parsed = JSON.parse(m.content);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        rawInput = parsed;
      }
    } catch {
      // Not JSON, no rawInput
    }
  }

  return {
    id: m.id,
    role: m.role,
    runId: m.runId,
    content: text,
    rawInput,
    fileRefs: allFileRefs.length > 0 ? allFileRefs : undefined,
    createdAt: m.createdAt,
  };
}
