# Reader Chapter Jump Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Jump to Chapter" Select dropdown to ReaderSettingsSheet that lists all chapters and navigates on selection.

**Architecture:** Wire the store (call `setCurrentTranslation` in route), add API type/function, add React Query hook, add Select component to settings sheet. Follows existing patterns: types+API in `mangaApi.ts`, hooks in `useManga.ts`, store via Zustand, shadcn Select for UI.

**Tech Stack:** TanStack Router, TanStack Query, Zustand, shadcn/ui, React, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/routes/_reader/reader.$translationId.tsx` | Modify | Call `setCurrentTranslation(data)` in useEffect |
| `frontend/src/services/api/mangaApi.ts` | Modify | Add `ReaderChapterItem` type + `getReaderChapters` function |
| `frontend/src/hooks/useManga.ts` | Modify | Add `useReaderChapters` hook |
| `frontend/src/components/reader/ReaderSettingsSheet.tsx` | Modify | Add chapter jump Select section |

---

### Task 1: Wire store in reader route

**Related skills:** `tanstack-router-best-practices`, `zustand`

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx`

- [ ] **Add `setCurrentTranslation` import and call**

Add to the store import line:
```typescript
const setCurrentTranslation = useReaderStore((s) => s.setCurrentTranslation)
```

After the `useEffect` that shows the toast message (lines 41-50), add:
```typescript
  useEffect(() => {
    if (data) {
      setCurrentTranslation(data)
    }
  }, [data, setCurrentTranslation])
```

- [ ] **Verify compilation**

Run: `cd frontend && npm run check`

Expected: No errors

---

### Task 2: Add type and API function

**Related skills:** `vercel-react-best-practices`

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`

- [ ] **Add `ReaderChapterItem` interface** after the `UpdateTranslationPayload` interface:

```typescript
export interface ReaderChapterItem {
  chapterId: number
  title: string | null
  translationId: number | null
  isFirstChapter: boolean
  isLatestChapter: boolean
}
```

- [ ] **Add `getReaderChapters` API function** after `getTranslation`:

```typescript
export async function getReaderChapters(
  mangaId: number,
  translatorId: number,
  language: string,
): Promise<ReaderChapterItem[]> {
  const res = await axiosInstance.get<ReaderChapterItem[]>('/mangas/reader/chapters', {
    params: { mangaId, translatorId, language },
  })
  return res.data
}
```

- [ ] **Verify compilation**

Run: `cd frontend && npm run check`

Expected: No errors

---

### Task 3: Add `useReaderChapters` hook

**Related skills:** `tanstack-query-best-practices`

**Files:**
- Modify: `frontend/src/hooks/useManga.ts`

- [ ] **Add imports** at the top:

```typescript
import {
  ...
  getReaderChapters,
} from '#/services/api/mangaApi'
import type {
  ...
  ReaderChapterItem,
} from '#/services/api/mangaApi'
```

- [ ] **Add the hook** after `useCreateChapterForManga` (before `useUpdateTranslation`):

```typescript
export function useReaderChapters(
  mangaId: number | undefined,
  translatorId: number | undefined,
  language: string | undefined,
) {
  return useQuery<ReaderChapterItem[]>({
    queryKey: ['manga', 'reader', 'chapters', mangaId, translatorId, language],
    queryFn: () => getReaderChapters(mangaId!, translatorId!, language!),
    enabled: !!mangaId && !!translatorId && !!language,
  })
}
```

- [ ] **Verify compilation**

Run: `cd frontend && npm run check`

Expected: No errors

---

### Task 4: Add chapter jump Select to ReaderSettingsSheet

**Related skills:** `shadcn`, `frontend-design`, `tanstack-router-best-practices`

**Files:**
- Modify: `frontend/src/components/reader/ReaderSettingsSheet.tsx`

- [ ] **Add imports**

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useNavigate } from '@tanstack/react-router'
import { useReaderChapters } from '#/hooks/useManga'
import { Loader2 } from 'lucide-react'
```

- [ ] **Add store reads and navigate hook** inside the component function, after existing store reads:

```typescript
  const currentChapter = useReaderStore((s) => s.currentChapter)
  const currentTranslation = useReaderStore((s) => s.currentTranslation)
  const navigate = useNavigate()

  const {
    data: chapters,
    isLoading: chaptersLoading,
  } = useReaderChapters(
    currentChapter?.mangaId,
    currentTranslation?.translator.id,
    currentTranslation?.language.code,
  )

  const handleJumpChapter = useCallback((chapterId: string) => {
    const chapter = chapters?.find((c) => c.chapterId === Number(chapterId))
    if (chapter?.translationId) {
      navigate({
        to: '/reader/$translationId',
        params: { translationId: String(chapter.translationId) },
      })
    }
  }, [chapters, navigate])
```

- [ ] **Add the section after the title block and before the first `<Separator />`**

After line 45 (`{title}`), insert:

```tsx
          {currentChapter && (
            <>
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Jump to Chapter
                </h3>
                <Select
                  value={String(currentChapter.id)}
                  onValueChange={handleJumpChapter}
                >
                  <SelectTrigger disabled={chaptersLoading}>
                    {chaptersLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <SelectValue placeholder="Jump to chapter..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {chapters?.map((ch) => (
                      <SelectItem
                        key={ch.chapterId}
                        value={String(ch.chapterId)}
                        disabled={
                          !ch.translationId ||
                          ch.chapterId === currentChapter.id
                        }
                      >
                        {ch.title ?? `Chapter ${ch.chapterId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
            </>
          )}
```

- [ ] **Verify compilation**

Run: `cd frontend && npm run check`

Expected: No errors

---

### Task 5: Build & verify

**Related skills:** `verification-before-completion`

- [ ] **TypeScript check**

Run: `cd frontend && npm run check`

Expected: No errors

- [ ] **Build**

Run: `cd frontend && npm run build`

Expected: 0 errors

---

### Task 6: Commit

- [ ] **Stage and commit**

```bash
git add frontend/src/routes/_reader/reader.$translationId.tsx
git add frontend/src/services/api/mangaApi.ts
git add frontend/src/hooks/useManga.ts
git add frontend/src/components/reader/ReaderSettingsSheet.tsx
git commit -m "feat: add chapter jump select to reader settings"
```
