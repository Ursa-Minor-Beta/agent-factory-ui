import { useMemo } from 'react';
import { Text, Code, Box } from '@mantine/core';
import { extractInnerFileRefs } from '../../types';
import { FileRefPreview } from '../../pages/Chat/ChatMessages/FileContent';

/**
 * Guess MIME type from field name based on common patterns.
 * Used for displaying file references with appropriate icons/previews.
 */
export function guessMimeType(fieldName: string): string {
  const lower = fieldName.toLowerCase();
  if (lower.includes('screenshot') || lower.includes('image') || lower.includes('png')) {
    return 'image/png';
  }
  if (lower.includes('jpg') || lower.includes('jpeg') || lower.includes('photo')) {
    return 'image/jpeg';
  }
  if (lower.includes('pdf')) {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

/**
 * Component to render JSON data while extracting and displaying file references separately.
 * File references in the format "inner:<fileId>:<fieldName>" are replaced with placeholders
 * and shown as visual file previews below the JSON.
 */
export function DataWithFileRefs({ data }: { data: unknown }) {
  const fileRefs = useMemo(() => {
    if (!data) return [];
    return extractInnerFileRefs(data);
  }, [data]);

  // Create a cleaned version of data with file refs replaced by placeholders
  const cleanedData = useMemo(() => {
    if (!data || fileRefs.length === 0) return data;

    const replaceRefs = (obj: unknown): unknown => {
      if (typeof obj === 'string' && obj.startsWith('inner:')) {
        return '[File Reference]';
      }
      if (Array.isArray(obj)) {
        return obj.map(replaceRefs);
      }
      if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceRefs(value);
        }
        return result;
      }
      return obj;
    };

    return replaceRefs(data);
  }, [data, fileRefs.length]);

  if (!data) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No data
      </Text>
    );
  }

  return (
    <>
      <Code block style={{ backgroundColor: 'transparent', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(cleanedData, null, 2)}
      </Code>
      {fileRefs.length > 0 && (
        <Box mt="sm">
          <Text size="xs" c="dimmed" mb="xs">Files ({fileRefs.length})</Text>
          <FileRefPreview
            fileRefs={fileRefs.map((ref) => ({
              fileId: ref.fileId,
              mimeType: guessMimeType(ref.fieldName),
              fieldName: ref.path || ref.fieldName,
            }))}
          />
        </Box>
      )}
    </>
  );
}
