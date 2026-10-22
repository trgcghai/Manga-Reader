# MR108 — Frontend Reading Flag Select on Manga Detail Page

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shadcn `<Select>` dropdown to the public manga detail page's `MangaDetailHeader` to let users set the reading flag.

**Architecture:** New `getReadingFlagLabel` utility in `mangaUtils.ts`. A new `<Select>` row with `Bookmark` icon added to `MangaDetailHeader`, calling `useUpdateMangaFlag()` mutation on change.

**Tech Stack:** React, shadcn/ui (Select), TanStack React Query, lucide-react

**Related Skills:** `frontend-design` (Task 2), `tanstack-query-best-practices` (Task 2)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/lib/mangaUtils.ts` | Modify | Add `getReadingFlagLabel` utility |
| `frontend/src/components/manga/MangaDetailHeader.tsx` | Modify | Add Select with mutation |

---

### Task 1: Add getReadingFlagLabel utility

**Files:**
- Modify: `frontend/src/lib/mangaUtils.ts`

**Related skills:** None (simple string utility)

- [ ] **Add `getReadingFlagLabel` function** after the existing `getStatusVariant` (after line 27):

```typescript
const getReadingFlagLabel = (flag: string): string =>
  flag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
```

- [ ] **Update the export** at the bottom of the file to include the new function:

```typescript
export { addTag, getStatusVariant, getReadingFlagLabel }
```

---

### Task 2: Add reading flag select to MangaDetailHeader

**Files:**
- Modify: `frontend/src/components/manga/MangaDetailHeader.tsx`

**Related skills:** `frontend-design` (shadcn Select integration, layout), `tanstack-query-best-practices` (mutation usage, loading state)

- [ ] **Update imports** at the top of the file:

```typescript
import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { READING_FLAGS } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { BookOpen, Bookmark, Info, Tags, UserRoundPen } from 'lucide-react'
import { getStatusVariant, getReadingFlagLabel } from '#/lib/mangaUtils'
import { useUpdateMangaFlag } from '#/hooks/useManga'
```

Note: `READING_FLAGS` is imported both as a value and as a type — add the value import line separately.

- [ ] **Add `useUpdateMangaFlag` hook call** inside the component function, before the return statement (after line 10):

```typescript
export function MangaDetailHeader({ manga }: MangaDetailHeaderProps) {
  const updateFlag = useUpdateMangaFlag()
```

- [ ] **Add the reading flag select row** after the status badge row (after line 75, before the description block):

```typescript
        <div className="flex flex-wrap gap-1.5">
          <span className="text-sm text-muted-foreground">
            <Bookmark className="size-5 inline-block" />
          </span>
          <Select
            value={manga.readingFlag ?? ''}
            onValueChange={(value) =>
              updateFlag.mutate({ mangaId: manga.id, flag: value || null })
            }
            disabled={updateFlag.isPending}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Set reading status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {READING_FLAGS.map((flag) => (
                <SelectItem key={flag} value={flag} className="capitalize">
                  {getReadingFlagLabel(flag)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
```

---

### Task 3: Verify build and tests pass

- [ ] **Run type check:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TS errors (only pre-existing ones).

- [ ] **Run existing tests:**

```bash
cd frontend && npm run test
```

Expected: 4 test files, 47 tests, all passed.
