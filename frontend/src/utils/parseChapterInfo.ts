export const DEFAULT_CHAPTER_PATTERN =
  /^(?:chapter\s*|ch\.?\s*|c\s*)?(\d+(?:\.\d+)?)(?:\s*-\s*(.+))?$/i

export function parseChapterInfoFromFilename(
  filename: string,
  pattern: RegExp = DEFAULT_CHAPTER_PATTERN,
): { chapterNumber: number | null; title: string | null } {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  const normalized = nameWithoutExt
  .normalize("NFKC")
  .replace(/[–—]/g, "-")
  .trim()

  const match = normalized.match(pattern)
  if (!match) return { chapterNumber: null, title: null }
  const title = match[2]?.trim() || null
  return { chapterNumber: parseFloat(match[1]), title }
}
