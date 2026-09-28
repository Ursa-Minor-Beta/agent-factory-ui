// File reference format: "inner:<fileId>:<fieldName>"
export interface InnerFileRef {
  fileId: string;
  fieldName: string;
}

// Parse inner file reference string
export function parseInnerFileRef(value: string): InnerFileRef | null {
  if (typeof value !== 'string' || !value.startsWith('inner:')) return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  return {
    fileId: parts[1],
    fieldName: parts.slice(2).join(':'), // fieldName may contain colons
  };
}

// Extract all inner file references from an object recursively
export function extractInnerFileRefs(
  data: unknown,
  refs: Array<{ path: string; fileId: string; fieldName: string }> = [],
  prefix = ''
): Array<{ path: string; fileId: string; fieldName: string }> {
  if (typeof data === 'string') {
    const ref = parseInnerFileRef(data);
    if (ref) {
      refs.push({ path: prefix, ...ref });
    }
  } else if (Array.isArray(data)) {
    data.forEach((item, index) => {
      extractInnerFileRefs(item, refs, prefix ? `${prefix}[${index}]` : `[${index}]`);
    });
  } else if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      extractInnerFileRefs(value, refs, prefix ? `${prefix}.${key}` : key);
    }
  }
  return refs;
}
