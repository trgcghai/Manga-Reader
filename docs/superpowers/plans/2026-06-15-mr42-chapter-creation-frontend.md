# MR42: Chapter & Translation Creation Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dialog-based chapter creation UI on the manga detail page that posts to `POST /mangas/{mangaId}/chapter`.

**Architecture:** Dialog component using `@tanstack/react-form` + Zod validation, with language/translator dropdowns fetched from existing hooks. On success: invalidate manga detail query, close dialog, toast.

**Tech Stack:** React + @tanstack/react-form + Zod + shadcn (Dialog, Select, Input, Button, Textarea)

---

### Task 1: Frontend — chapter API service

**Skills:** `vercel-react-best-practices`

**Files:**
- Create: `frontend/src/services/api/chapterApi.ts`

- [ ] **Step 1: Create chapterApi.ts**

```typescript
// frontend/src/services/api/chapterApi.ts
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api/chapterApi.ts
git commit -m "feat(frontend): add createChapter API service"
```

---

### Task 2: Frontend — chapter creation hook

**Skills:** `tanstack-query-best-practices`, `vercel-react-best-practices`

**Files:**
- Create: `frontend/src/hooks/useChapters.ts`

- [ ] **Step 1: Create useChapters.ts**

```typescript
// frontend/src/hooks/useChapters.ts
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useChapters.ts
git commit -m "feat(frontend): add useCreateChapter hook"
```

---

### Task 3: Frontend — AddChapterDialog component

**Skills:** `shadcn`, `frontend-design`, `vercel-react-best-practices`

**Files:**
- Create: `frontend/src/components/chapter/AddChapterDialog.tsx`

- [ ] **Step 1: Read existing reference files**

Read `frontend/src/components/author/AddAuthorDialog.tsx` and `frontend/src/components/manga/MangaForm.tsx` to understand dialog + form patterns.

- [ ] **Step 2: Create AddChapterDialog.tsx**

```typescript
// frontend/src/components/chapter/AddChapterDialog.tsx
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useCreateChapter } from '#/hooks/useChapters'
import { useLanguageList } from '#/hooks/useLanguages'
import { useTranslatorList } from '#/hooks/useTranslators'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Field as UiField,
  FieldLabel,
  FieldError as UiFieldError,
} from '#/components/ui/field'
import { Loader2 } from 'lucide-react'

const chapterSchema = z.object({
  number: z.coerce.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  releaseDate: z.string().optional(),
  note: z.string().optional(),
  languageId: z.coerce.number({ required_error: 'Language is required' }),
  translatorId: z.coerce.number({ required_error: 'Translator is required' }),
  folderPath: z.string().min(1, 'Folder path is required'),
})

type FormValues = z.infer<typeof chapterSchema>

const defaultValues: FormValues = {
  number: 1,
  title: '',
  releaseDate: '',
  note: '',
  languageId: 0 as unknown as number,
  translatorId: 0 as unknown as number,
  folderPath: '',
}

interface AddChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}

export default function AddChapterDialog({
  open,
  onOpenChange,
  mangaId,
}: AddChapterDialogProps) {
  const createMutation = useCreateChapter(mangaId)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)

  const form = useForm({
    validators: { onSubmit: chapterSchema },
    defaultValues,
    onSubmit: async (values) => {
      createMutation.mutate(values.value, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Chapter</DialogTitle>
          <DialogDescription>
            Create a new chapter with its initial translation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="space-y-4 py-4">
            <form.Field name="number">
              {(field) => (
                <UiField>
                  <FieldLabel>Chapter Number</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="title">
              {(field) => (
                <UiField>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="releaseDate">
              {(field) => (
                <UiField>
                  <FieldLabel>Release Date</FieldLabel>
                  <Input
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="note">
              {(field) => (
                <UiField>
                  <FieldLabel>Note</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="languageId">
              {(field) => (
                <UiField>
                  <FieldLabel>Language</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          languagesLoading ? 'Loading...' : 'Select language'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {languages?.map((lang) => (
                        <SelectItem key={lang.id} value={String(lang.id)}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="translatorId">
              {(field) => (
                <UiField>
                  <FieldLabel>Translator</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          translatorsLoading ? 'Loading...' : 'Select translator'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {translatorsData?.data.map((tr) => (
                        <SelectItem key={tr.id} value={String(tr.id)}>
                          {tr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="folderPath">
              {(field) => (
                <UiField>
                  <FieldLabel>Folder Path</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="/chapters/volume-1/chapter-1"
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chapter/AddChapterDialog.tsx
git commit -m "feat(frontend): add AddChapterDialog with @tanstack/react-form and Zod validation"
```

Note: In PowerShell, escape `!` in the commit message with backtick or use single quotes.

---

### Task 4: Frontend — integrate dialog into manga detail page

**Skills:** `shadcn`, `frontend-design`, `tanstack-router-best-practices`

**Files:**
- Modify: `frontend/src/routes/admin/mangas/$id.index.tsx`

- [ ] **Step 1: Read existing detail page**

Read `frontend/src/routes/admin/mangas/$id.index.tsx` fully.

- [ ] **Step 2: Add dialog import + state + button replacements**

Add import for the dialog:
```typescript
import { Plus } from 'lucide-react'  // already imported if not, add it
import AddChapterDialog from '#/components/chapter/AddChapterDialog'
```

Add state in `MangaDetailPage`:
```typescript
const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
```

**Replace the empty-state "Add Chapter" button** (currently navigates to edit page):

Change:
```tsx
<Button
  onClick={() =>
    navigate({ to: '/admin/mangas/$id/edit', params: { id } })
  }
>
  Add Chapter
</Button>
```
To:
```tsx
<Button onClick={() => setChapterDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Add Chapter
</Button>
```

**Add an "Add Chapter" button above the chapter table** (when chapters exist). After the `<h2 className="mb-4 text-xl font-semibold">Chapters</h2>` line and before the `{manga.chapters.length === 0` check, add:

```tsx
<div className="mb-4 flex items-center justify-between">
  <h2 className="text-xl font-semibold">Chapters</h2>
  <Button onClick={() => setChapterDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Add Chapter
  </Button>
</div>
```

But the current code has `<h2>` inside the render... Let me adjust. The current structure is:
```tsx
<h2 className="mb-4 text-xl font-semibold">Chapters</h2>

{manga.chapters.length === 0 ? (
  <Empty>...</Empty>
) : (
  <Table>...</Table>
)}
```

Change to:
```tsx
<div className="mb-4 flex items-center justify-between">
  <h2 className="text-xl font-semibold">Chapters</h2>
  <Button onClick={() => setChapterDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Add Chapter
  </Button>
</div>

{manga.chapters.length === 0 ? (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <BookOpen />
      </EmptyMedia>
      <EmptyTitle>No Chapters Yet</EmptyTitle>
    </EmptyHeader>
    <EmptyContent>
      <Button onClick={() => setChapterDialogOpen(true)}>
        Add Chapter
      </Button>
    </EmptyContent>
  </Empty>
) : (
  <Table>...</Table>
)}
```

**Add the dialog component** at the bottom of the JSX (before closing `</div>`):

```tsx
<AddChapterDialog
  open={chapterDialogOpen}
  onOpenChange={setChapterDialogOpen}
  mangaId={mangaId}
/>
```

- [ ] **Step 3: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/admin/mangas/\$id.index.tsx
git commit -m "feat(frontend): wire AddChapterDialog into manga detail page"
```

---

### Task 5: Frontend — final verification

**Skills:** `verification-before-completion`

**Files:**
- N/A (verification only)

- [ ] **Step 1: Full frontend build**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 2: Backend test suite (verify no backend regression)**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest --no-coverage`

Expected: All 244+ tests PASS.

- [ ] **Step 3: Final commit if any remaining changes**

```bash
git status  # verify clean
```
