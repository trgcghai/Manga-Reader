# MR110 — Frontend readingFlag Filter in API + Hook

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add typed `readingFlag` parameter to `getAllMangas` API function and `useMangaList` hook.

**Architecture:** New `ReadingFlagFilter` type (`ReadingFlag | 'any'`) in `mangaApi.ts`. Parameter added to `getAllMangas` params, `mangaKeys.list` params, and `useMangaList` params.

**Tech Stack:** TypeScript, Axios, TanStack React Query

**Related Skills:** `tanstack-query-best-practices` (Task 2)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/services/api/mangaApi.ts` | Modify | Add `ReadingFlagFilter` type, add `readingFlag` to `getAllMangas` params |
| `frontend/src/hooks/useManga.ts` | Modify | Add `readingFlag` to `mangaKeys.list` params + tuple, add to `useMangaList` params |

---

### Task 1: Add ReadingFlagFilter type and update getAllMangas

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`

**Related skills:** None (type + API function follow existing patterns)

- [ ] **Add `ReadingFlagFilter` type** after the existing `ReadingFlag` type (after line 25):

```typescript
export type ReadingFlagFilter = ReadingFlag | 'any'
```

- [ ] **Add `readingFlag` to `getAllMangas` params** (after `genres` on line 108):

```typescript
export async function getAllMangas(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
  readingFlag?: ReadingFlagFilter
}): Promise<PaginatedResponse<MangaResponse>> {
```

- [ ] **Add query param forwarding** after the existing `genres` line (after line 117):

```typescript
  if (params.readingFlag) queryParams.readingFlag = params.readingFlag
```

---

### Task 2: Add readingFlag to useMangaList hook and query key

**Files:**
- Modify: `frontend/src/hooks/useManga.ts`

**Related skills:** `tanstack-query-best-practices` — query key invalidation when filter changes

- [ ] **Add `ReadingFlagFilter` import** to the type imports:

```typescript
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
  ReadingFlagFilter,
} from '#/services/api/mangaApi'
```

- [ ] **Add `readingFlag` to `mangaKeys.list` params type and tuple** (lines 34-51):

```typescript
const mangaKeys = {
  all: ['mangas'] as const,
  list: (params: {
    page: number
    limit: number
    search?: string
    status?: string
    authors?: string
    genres?: string
    readingFlag?: ReadingFlagFilter
  }) =>
    [
      ...mangaKeys.all,
      'list',
      params.page,
      params.limit,
      params.search,
      params.status,
      params.authors,
      params.genres,
      params.readingFlag,
    ] as const,
  detail: (id: number) => [...mangaKeys.all, 'detail', id] as const,
}
```

- [ ] **Add `readingFlag` to `useMangaList` params** (lines 55-62):

```typescript
export function useMangaList(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
  readingFlag?: ReadingFlagFilter
}) {
```

---

### Task 3: Verify build and tests pass

- [ ] **Run type check:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TS errors in `mangaApi.ts` or `useManga.ts` (only pre-existing errors in other files).

- [ ] **Run existing tests:**

```bash
cd frontend && npm run test
```

Expected: 4 test files, 47 tests, all passed.
