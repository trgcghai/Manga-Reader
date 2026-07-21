import { MIME_MAP } from 'src/common/constants/file.constant';

export function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return ext && MIME_MAP[ext] ? MIME_MAP[ext] : 'application/octet-stream';
}

export function extractKeyFromUrl(
  url: string,
  endpoint: string,
  bucket: string,
): string | null {
  const prefix = `${endpoint}/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
