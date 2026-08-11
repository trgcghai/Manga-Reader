import { ChapterExtractor } from './chapter-extractor.interface';

export class JsonPathExtractor implements ChapterExtractor {
  constructor(private readonly path?: string | null) {}

  extract(responseBody: unknown): string | null {
    if (!this.path) {
      return this.toPrimitiveString(
        this.readKey(responseBody, 'chapterNumber'),
      );
    }
    return this.toPrimitiveString(this.navigate(responseBody, this.path));
  }

  private navigate(body: unknown, path: string): unknown {
    let current: unknown = body;
    for (const segment of path.split('.')) {
      if (current == null) {
        return null;
      }
      const { key, index } = this.parseSegment(segment);
      current = this.readKey(current, key);
      if (index !== null) {
        if (!Array.isArray(current)) {
          return null;
        }
        current = current[index];
      }
    }
    return current;
  }

  private parseSegment(segment: string): {
    key: string;
    index: number | null;
  } {
    const match = segment.match(/^([^[]+)(?:\[(\d+)\])?$/);
    if (!match) {
      return { key: segment, index: null };
    }
    return {
      key: match[1],
      index: match[2] ? parseInt(match[2], 10) : null,
    };
  }

  private readKey(obj: unknown, key: string): unknown {
    if (obj == null || typeof obj !== 'object') {
      return null;
    }
    const record = obj as Record<string, unknown>;
    return key in record ? record[key] : null;
  }

  private toPrimitiveString(value: unknown): string | null {
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return null;
  }
}
