export interface ChapterExtractor {
  extract(responseBody: unknown): string | null;
}
