import { getContentType } from './file-mime.util';

describe('file-mime.util', () => {
  it('should return image/jpeg for .jpg', () => {
    expect(getContentType('covers/abc.jpg')).toBe('image/jpeg');
  });

  it('should return image/jpeg for .jpeg', () => {
    expect(getContentType('covers/abc.jpeg')).toBe('image/jpeg');
  });

  it('should return image/png for .png', () => {
    expect(getContentType('pages/xyz.png')).toBe('image/png');
  });

  it('should return image/webp for .webp', () => {
    expect(getContentType('thumbnails/thumb.webp')).toBe('image/webp');
  });

  it('should return application/octet-stream for unknown extension', () => {
    expect(getContentType('file.bin')).toBe('application/octet-stream');
  });

  it('should handle path with multiple dots', () => {
    expect(getContentType('pages/a.b.c.png')).toBe('image/png');
  });
});
