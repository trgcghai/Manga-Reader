import { MIME_MAP } from 'src/common/constants/file.constant';

export function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return ext && MIME_MAP[ext] ? MIME_MAP[ext] : 'application/octet-stream';
}

export function extractKeyFromUrl(
  url: string,
  publicUrl: string,
  bucket: string,
): string | null {
  try {
    const objectUrl = new URL(url);
    const publicStorageUrl = new URL(publicUrl);
    if (objectUrl.origin !== publicStorageUrl.origin) return null;

    const basePath = publicStorageUrl.pathname.replace(/\/+$/, '');
    const bucketPrefix = `${basePath}/${encodeURIComponent(bucket)}/`;
    if (!objectUrl.pathname.startsWith(bucketPrefix)) return null;

    const encodedKey = objectUrl.pathname.slice(bucketPrefix.length);
    if (!encodedKey) return null;
    return decodeURIComponent(encodedKey);
  } catch {
    return null;
  }
}
