import { extractKeyFromUrl, getContentType } from './file-mime.util';

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

  describe('extractKeyFromUrl', () => {
    it('extracts and decodes the key under the configured public URL and bucket', () => {
      expect(
        extractKeyFromUrl(
          'https://cdn.example.com/assets/test-bucket/manga/cover/my%20cover.jpg',
          'https://cdn.example.com/assets',
          'test-bucket',
        ),
      ).toBe('manga/cover/my cover.jpg');
    });

    it('rejects a different public host or bucket', () => {
      expect(
        extractKeyFromUrl(
          'https://elsewhere.example.com/test-bucket/file.jpg',
          'https://cdn.example.com',
          'test-bucket',
        ),
      ).toBeNull();
      expect(
        extractKeyFromUrl(
          'https://cdn.example.com/other-bucket/file.jpg',
          'https://cdn.example.com',
          'test-bucket',
        ),
      ).toBeNull();
    });

    it('rejects malformed URL encoding in the key', () => {
      expect(
        extractKeyFromUrl(
          'https://cdn.example.com/test-bucket/file%ZZ.jpg',
          'https://cdn.example.com',
          'test-bucket',
        ),
      ).toBeNull();
    });
  });
});
