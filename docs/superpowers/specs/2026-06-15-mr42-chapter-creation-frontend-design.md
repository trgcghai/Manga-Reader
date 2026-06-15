# MR42: Chapter & Translation Creation Frontend — Design Spec

## Overview

Build a dialog-based chapter creation UI on the manga detail page. The dialog uses `@tanstack/react-form` with Zod validation, posts to `POST /mangas/{mangaId}/chapter`, and refreshes the chapter list on success.

## New Files

### 1. `frontend/src/services/api/chapterApi.ts`

```typescript
import axiosInstance from '#/services/api/api'

export interface CreateChapterPayload {
  number: number
  title: string
  releaseDate?: string
  note?: string
  languageId: number
  translatorId: number
  folderPath: string
}

export async function createChapter(
  mangaId: number,
  data: CreateChapterPayload,
): Promise<void> {
  await axiosInstance.post(`/mangas/${mangaId}/chapter`, data)
}
```

No return value needed — chapter list is refetched via query invalidation.

### 2. `frontend/src/hooks/useChapters.ts`

```typescript
import { createChapter } from '#/services/api/chapterApi'
import type { CreateChapterPayload } from '#/services/api/chapterApi'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateChapter(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChapterPayload) => createChapter(mangaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Chapter created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create chapter')
    },
  })
}
```

### 3. `frontend/src/components/chapter/AddChapterDialog.tsx`

**Dialog pattern:** Follows `AddAuthorDialog.tsx` structure (open/onOpenChange props, DialogContent, DialogHeader, DialogFooter).

**Form pattern:** Uses `@tanstack/react-form` with Zod schema (like `MangaForm.tsx`).

**Zod schema:**

```typescript
const chapterSchema = z.object({
  number: z.coerce.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  releaseDate: z.string().optional(),
  note: z.string().optional(),
  languageId: z.coerce.number({ required_error: 'Language is required' }),
  translatorId: z.coerce.number({ required_error: 'Translator is required' }),
  folderPath: z.string().min(1, 'Folder path is required'),
})
```

**Fields:**

| Field | Widget | Source |
|-------|--------|--------|
| number | Input type="number" | — |
| title | Input | — |
| releaseDate | Input type="date" | — |
| note | Textarea | — |
| languageId | Select | `useLanguageList()` → `LanguageResponse[]` |
| translatorId | Select | `useTranslatorList(1, 100)` → `PaginatedTranslatorResponse` |
| folderPath | Input | — |

**States:**

| State | Rendering |
|-------|-----------|
| Dropdowns loading | Select trigger shows "Loading..." disabled |
| Submitting | Button shows `<Loader2>` spinner, fields disabled |
| Server error | Displayed as form-level error text |
| Success | Dialog closes, toast, list refreshes |

**Props:**

```typescript
interface AddChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}
```

## Modified Files

### `frontend/src/routes/admin/mangas/$id.index.tsx`

1. Add `useState` for dialog open state
2. Import `AddChapterDialog`
3. Replace both "Add Chapter" buttons (empty state + add one above the table when chapters exist) with dialog triggers
4. Render `<AddChapterDialog>` at the bottom of the component

```tsx
const [chapterDialogOpen, setChapterDialogOpen] = useState(false)

// In the header area, next to "Edit Manga" button:
<Button onClick={() => setChapterDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Add Chapter
</Button>

// In empty state, replace the navigate(...) call:
<Button onClick={() => setChapterDialogOpen(true)}>
  Add Chapter
</Button>

// At bottom of component:
<AddChapterDialog
  open={chapterDialogOpen}
  onOpenChange={setChapterDialogOpen}
  mangaId={mangaId}
/>
```

## Route Registration

No new routes — everything is dialog-based. No `generate-routes` needed.

## Acceptance Criteria Checklist

- [ ] "Add Chapter" on detail page opens dialog
- [ ] All 7 form fields render correctly (text input, number input, date input, textarea, 2 selects)
- [ ] Language dropdown populated from `GET /language`
- [ ] Translator dropdown populated from `GET /translators`
- [ ] Zod validates required fields before submit
- [ ] Submit calls `POST /mangas/:mangaId/chapter`
- [ ] Success: dialog closes, manga detail refetches, toast appears
- [ ] Server error (conflict, not found) displayed in form
- [ ] Submitting state shows spinner + disables fields
- [ ] Dropdowns show loading state while fetching
- [ ] "Add Chapter" button also visible when chapters exist (above table)
- [ ] No regressions to detail page or other admin pages
