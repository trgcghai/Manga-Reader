const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return ext && MIME_MAP[ext] ? MIME_MAP[ext] : 'application/octet-stream';
}
