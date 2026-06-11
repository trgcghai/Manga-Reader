export type ImageExtension = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';

export interface ScannedImage {
  name: string;
  path: string;
  extension: ImageExtension;
}

export interface ScanImagesResult {
  path: string;
  images: ScannedImage[];
}

export const SUPPORTED_IMAGE_EXTENSIONS = new Set<ImageExtension>([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
]);

export const filenameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
