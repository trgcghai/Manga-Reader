# MR107 — Frontend Reading Flag API Client & Hook Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `updateMangaFlag` API function and `useUpdateMangaFlag` React Query hook to the frontend.

**Architecture:** New `ReadingFlag` type derived from a const array in `mangaApi.ts`, a typed `updateMangaFlag` PATCH function, and a `useUpdateMangaFlag` mutation hook that invalidates the manga cache and shows toast on success/error.

**Tech Stack:** TypeScript, Axios, TanStack React Query, sonner (toast)

**Related Skills:** `tanstack-query-best-practices` (Task 2), `react-testing-library` (Task 3)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/services/api/mangaApi.ts` | Modify | Add `ReadingFlag` type, `updateMangaFlag` function, update `MangaResponse` |
| `frontend/src/hooks/useManga.ts` | Modify | Add `useUpdateMangaFlag` mutation hook; import `ReadingFlag` type |

---

### Task 1: Add ReadingFlag type, update MangaResponse, add updateMangaFlag API function

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`

**Related skills:** None (type definitions and API function follow existing patterns)

- [ ] **Add `ReadingFlag` type and `READING_FLAGS` const** after the existing interface definitions (before line 90):

```typescript
export const READING_FLAGS = [
  'reading',
  're-reading',
  'planned',
  'completed',
  'paused',
  'dropped',
] as const

export type ReadingFlag = (typeof READING_FLAGS)[number]
```

- [ ] **Add `readingFlag` to `MangaResponse`** (line 9, after `status`):

```typescript
export interface MangaResponse {
  id: number
  title: string
  alternativeTitles: string[]
  description: string
  coverPath: string
  status: string
  readingFlag: ReadingFlag | null
  authors: { id: number; name: string; createdAt: string; updatedAt: string }[]
  genres: { id: number; name: string; createdAt: string; updatedAt: string }[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Add `updateMangaFlag` function** after the existing `getManga` function (after line 131):

```typescript
export async function updateMangaFlag(
  mangaId: number,
  flag: ReadingFlag | null,
): Promise<MangaResponse> {
  const res = await axiosInstance.patch<MangaResponse>(
    `/mangas/${mangaId}/flag`,
    { flag },
  )
  return res.data
}
```

---

### Task 2: Add useUpdateMangaFlag hook

**Files:**
- Modify: `frontend/src/hooks/useManga.ts`

**Related skills:** `tanstack-query-best-practices` — mutation patterns, cache invalidation

- [ ] **Add import** for `updateMangaFlag` and `ReadingFlag` type in the existing import lines (lines 1-14):

```typescript
import {
  createManga,
  getAllMangas,
  getManga,
  updateManga,
  deleteManga,
  importMangas,
  getTemplateImport,
  createChapter,
  updateTranslation,
  deleteTranslation,
  getTranslation,
  getReaderChapters,
  updateMangaFlag,
} from '#/services/api/mangaApi'
import type {
  CreateMangaPayload,
  ImportResult,
  MangaResponse,
  MangaDetailResponse,
  PaginatedResponse,
  UpdateMangaPayload,
  CreateChapterPayload,
  UpdateTranslationPayload,
  TranslationDetailResponse,
  ReaderChapterItem,
  ReadingFlag,
} from '#/services/api/mangaApi'
```

- [ ] **Add `useUpdateMangaFlag` hook** after the existing `useUpdateManga` function (after line 106):

```typescript
export function useUpdateMangaFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mangaId, flag }: { mangaId: number; flag: ReadingFlag | null }) =>
      updateMangaFlag(mangaId, flag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
      toast.success('Reading flag updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update reading flag',
      )
    },
  })
}
```

---

### Task 3: Verify build and tests pass

**Related skills:** None (verification step)

- [ ] **Run type check:**

```bash
cd frontend && npm run check
```

Expected: no TS errors.

- [ ] **Run existing tests** to confirm no regressions:

```bash
cd frontend && npm run test
```

Expected: all existing tests pass.
