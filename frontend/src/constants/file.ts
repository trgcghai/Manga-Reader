export const COVER_ACCEPT: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
}

export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const MAX_COVER_FILE_SIZE = 10 * 1024 * 1024

export const TRANSLATION_ACCEPT: Record<string, string[]> = {
  'application/zip': ['.zip'],
}

export const TRANSLATION_MIME_TYPES = ['application/zip'] as const

export const TRANSLATION_EXTENSIONS = ['zip'] as const

export const MAX_TRANSLATION_FILE_SIZE = 100 * 1024 * 1024

export const IMAGE_EXTENSIONS_REGEX = /\.(jpg|jpeg|png|webp|gif)$/i

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function mimeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext && MIME_MAP[ext] ? MIME_MAP[ext] : 'image/jpeg'
}
