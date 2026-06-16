import { getContentType } from './file-mime.util';

describe('getContentType', () => {
  it('returns image/jpeg for .jpg', () => {
    expect(getContentType('cover.jpg')).toBe('image/jpeg');
  });

  it('returns image/jpeg for .jpeg', () => {
    expect(getContentType('cover.jpeg')).toBe('image/jpeg');
  });

  it('returns image/png for .png', () => {
    expect(getContentType('cover.png')).toBe('image/png');
  });

  it('returns image/webp for .webp', () => {
    expect(getContentType('cover.webp')).toBe('image/webp');
  });

  it('returns application/octet-stream for unknown extension', () => {
    expect(getContentType('cover.bin')).toBe('application/octet-stream');
  });

  it('returns application/octet-stream for no extension', () => {
    expect(getContentType('cover')).toBe('application/octet-stream');
  });

  it('handles uppercase extension', () => {
    expect(getContentType('cover.JPG')).toBe('image/jpeg');
  });

  it('handles multi-dot filename', () => {
    expect(getContentType('some.file.png')).toBe('image/png');
  });

  it('handles empty string', () => {
    expect(getContentType('')).toBe('application/octet-stream');
  });
});
