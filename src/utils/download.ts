export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Replaces characters not allowed in file names on common OSes
export function safeFilename(name: string, fallback = 'export') {
  const safe = name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').trim();
  return safe || fallback;
}
