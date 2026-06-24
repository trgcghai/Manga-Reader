export const DEFAULT_CHAPTER_PATTERN =
  /^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)/i

export function parseChapterNumberFromFilename(
  filename: string,
  pattern: RegExp = DEFAULT_CHAPTER_PATTERN,
): number | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const match = nameWithoutExt.match(pattern)
  if (!match) return null
  return parseFloat(match[1])
}
