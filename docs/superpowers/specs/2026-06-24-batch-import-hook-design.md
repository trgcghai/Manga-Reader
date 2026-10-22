# Batch Import Hook Design

## Overview

`useBatchImport` hook for sequential CBZ/ZIP file upload + chapter creation from a folder picker, with progress tracked via updatable toast that survives navigation.

## Files

| File | Purpose |
|------|---------|
| `frontend/src/utils/parseChapterNumber.ts` | Pure function: extract chapter number from filename |
| `frontend/src/utils/parseChapterNumber.spec.ts` | Unit tests |
| `frontend/src/hooks/useBatchImport.ts` | Hook: async loop, progress state, toast |
| `frontend/src/hooks/useBatchImport.spec.ts` | Unit tests with mocked APIs |

## `parseChapterNumberFromFilename`

Pure function, no hooks, no side effects.

```ts
export const DEFAULT_CHAPTER_PATTERN = /^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)/i

export function parseChapterNumberFromFilename(
  filename: string,
  pattern: RegExp = DEFAULT_CHAPTER_PATTERN,
): number | null
```

- Strips file extension (last `.` onwards)
- Matches against pattern
- `parseFloat` on capture group (handles leading zeros and decimals)
- Returns `null` on no match

### Expected outputs

| Input | Output |
|-------|--------|
| `chapter 1.cbz` | `1` |
| `c002.zip` | `2` |
| `c200.4.cbz` | `200.4` |
| `chapter 100.1.zip` | `100.1` |
| `ChApTeR 5.cbz` | `5` |
| `03-scan.cbz` | `3` |
| `readme.txt` | `null` |

## `useBatchImport`

### Signature

```ts
function useBatchImport(
  mangaId: number,
  options?: { filenamePattern?: RegExp },
): {
  mutate: (files: File[], importOptions: { languageId: number; translatorId: number }) => void
  progress: { total: number; completed: number; failed: number }
  isRunning: boolean
}
```

### Approach

- Custom async loop (no `useMutation`)
- `useRef` for `isRunning` flag
- `useState` for reactive `progress`
- Module-level toast ID constant `'batch-import'` for cross-navigation survival

### Loop behavior

1. Guard: if `isRunning` → return (ignore concurrent calls)
2. Reset progress, set `isRunning`
3. `toast.loading("0 / N chapters...", { id: 'batch-import' })`
4. For each file (sequentially):
   - Parse chapter number → `null`? skip, warning, `failed++`, continue
   - `await uploadTranslation(file, mangaId, num)`
   - `await createChapter(mangaId, { number: num, languageId, translatorId, url })`
   - Success → `completed++`, Failure → `failed++`
   - Update toast: `"X / N chapters imported..."`
5. Set `isRunning = false`
6. Invalidate `['mangas', 'detail', mangaId]` query
7. Final toast with summary

### Error handling

- Upload fails → `failed++`, warning toast per file, continue
- Chapter create fails (duplicate, validation) → `failed++`, warning toast, continue
- Unparseable filename → `failed++`, skip file, no API calls
- Empty files array → immediate toast "No files to import", return early
- Network error mid-flight → caught by try/catch, `failed++`, continue

### Final toast patterns

| Scenario | Toast type | Message |
|----------|-----------|---------|
| All succeed | success | `Imported 12 / 12 chapters successfully` |
| Partial failure | warning | `Imported 10 / 12 chapters (2 failed)` |
| All fail | error | `0 / 5 chapters imported (5 failed)` |

### Toast navigation survival

Sonner renders in a portal outside React Router. A stable toast ID (`'batch-import'`) means the same toast element is updated across the entire lifecycle. If the hook's component unmounts (user navigates), the toast persists with its last-updated text. Final toast is permanent.

### Duplicate detection

Per-file: `createChapter` throws 409/400 → caught as failure. Upload is already done — acceptable tradeoff (CBZ files are small).

### Testing

**`parseChapterNumberFromFilename.spec.ts`:**
- Each spec example as a test case
- Case insensitivity, no match, custom pattern, leading-number fallback
- Multiple dots in filename

**`useBatchImport.spec.ts`** (mocked API):
- Sequential execution order
- Progress updates (completed/failed)
- Failed upload → loop continues
- Failed chapter create → loop continues
- Unparseable filename → no API calls
- Empty files array → no API calls
- Toast content verification

## Dependencies

- Sonner `toast` (already installed)
- `uploadTranslation` from `#/services/api/fileApi`
- `createChapter` from `#/services/api/mangaApi`
- `useCallback`, `useRef`, `useState`, `useQueryClient` from React/TanStack
