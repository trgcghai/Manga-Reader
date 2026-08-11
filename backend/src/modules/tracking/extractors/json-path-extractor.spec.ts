import { JsonPathExtractor } from './json-path-extractor';

describe('JsonPathExtractor', () => {
  describe('without an extractor path', () => {
    it('should extract root chapterNumber as a string', () => {
      const extractor = new JsonPathExtractor();
      expect(extractor.extract({ chapterNumber: 1120 })).toBe('1120');
      expect(extractor.extract({ chapterNumber: '1120.5' })).toBe('1120.5');
    });

    it('should return null when chapterNumber is missing', () => {
      expect(new JsonPathExtractor().extract({ foo: 'bar' })).toBeNull();
    });

    it('should return null when the value is not a string or number', () => {
      expect(
        new JsonPathExtractor().extract({ chapterNumber: {} }),
      ).toBeNull();
    });
  });

  describe('with a dot-notation path', () => {
    it('should navigate nested objects', () => {
      const extractor = new JsonPathExtractor('data.chapterNumber');
      expect(extractor.extract({ data: { chapterNumber: 7 } })).toBe('7');
    });

    it('should navigate array indices', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      const body = { data: { chapters: [{ number: '1120.5' }] } };
      expect(extractor.extract(body)).toBe('1120.5');
    });

    it('should return null when an intermediate segment is missing', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: {} })).toBeNull();
    });

    it('should return null when the array index is out of bounds', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: { chapters: [] } })).toBeNull();
    });

    it('should return null when an intermediate value is not an array', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: { chapters: 'x' } })).toBeNull();
    });
  });

  describe('constructor with null path', () => {
    it('should fall back to root chapterNumber', () => {
      const extractor = new JsonPathExtractor(null);
      expect(extractor.extract({ chapterNumber: '3' })).toBe('3');
    });
  });
});
