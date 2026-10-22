export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_TRANSLATION_MIME_TYPES: readonly string[] = [
  'application/zip',
];

export const ALLOWED_TRANSLATION_EXTENSIONS: readonly string[] = ['zip'];

export const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'zip',
};

export const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  zip: 'application/zip',
};

export const MAX_COVER_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TRANSLATION_FILE_SIZE = 100 * 1024 * 1024;

export const STORAGE_CLIENT = Symbol('STORAGE_CLIENT');
