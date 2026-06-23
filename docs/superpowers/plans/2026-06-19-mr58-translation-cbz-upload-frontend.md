# MR58 — CBZ File Upload Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `url` text input in AddChapterDialog, AddTranslationDialog, and EditTranslationDialog with a CBZ file upload that calls `POST /files/upload/translation`.

**Architecture:** New `uploadTranslation()` API function and `useTranslationFileUpload()` hook. Each dialog uploads the CBZ file first, gets the URL, then calls create/update with the URL. EditTranslationDialog shows existing filename with "Replace" button.

**Tech Stack:** TanStack Query (useMutation), shadcn/ui (Input, Button, Field), axios, Zod, @tanstack/react-form

---

### File Inventory

| Action | File |
|---|---|
| Modify | `frontend/src/services/api/fileApi.ts` |
| Modify | `frontend/src/hooks/useFile.ts` |
| Modify | `frontend/src/components/chapter/AddChapterDialog.tsx` |
| Modify | `frontend/src/components/chapter/AddTranslationDialog.tsx` |
| Modify | `frontend/src/components/chapter/EditTranslationDialog.tsx` |
| Modify | `frontend/src/routes/admin/mangas/$id.index.tsx` |

---

### Task 1: Add `uploadTranslation` API function

**Related skills:** `tanstack-query-best-practices` (consistent API layer design)

**Files:**
- Modify: `frontend/src/services/api/fileApi.ts`

- [ ] **Step 1: Add the API function**

In `fileApi.ts`, add after the existing `uploadCover` function:

```ts
export async function uploadTranslation(
  file: File,
  mangaId: number,
  chapterNumber: number,
): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('mangaId', String(mangaId))
  formData.append('chapterNumber', String(chapterNumber))
  const res = await axiosInstance.post<UploadFileResponse>(
    '/files/upload/translation',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return res.data
}
```

> **Why chapterNumber is a param (not captured at mutation time):** The hook uses `useMutation<..., { file: File; chapterNumber: number }>` so `chapterNumber` is passed at mutation invocation, not at hook creation. This avoids stale closures when the value changes (e.g., user edits the number field before submitting).

- [ ] **Step 2: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/fileApi.ts
git commit -m "feat: add uploadTranslation API function"
```

---

### Task 2: Add `useTranslationFileUpload` hook

**Related skills:** `tanstack-query-best-practices` (mutation patterns — `useMutation` with proper error handling)

**Files:**
- Modify: `frontend/src/hooks/useFile.ts`

- [ ] **Step 1: Add the hook**

In `useFile.ts`, add after the existing `useCoverUpload`:

```ts
export function useTranslationFileUpload(mangaId: number) {
  return useMutation<
    UploadFileResponse,
    Error,
    { file: File; chapterNumber: number }
  >({
    mutationFn: ({ file, chapterNumber }) =>
      uploadTranslation(file, mangaId, chapterNumber),
  })
}
```

> **`mutationFn` receives `{ file, chapterNumber }`:** This lets each dialog pass the chapter number at mutation time (e.g., `mutateAsync({ file, chapterNumber: values.value.number })`), avoiding stale closure bugs.

Also add the import (update existing `uploadCover` import line to include `uploadTranslation`):

```ts
import { uploadCover, uploadTranslation } from '#/services/api/fileApi'
```

- [ ] **Step 2: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useFile.ts
git commit -m "feat: add useTranslationFileUpload hook"
```

---

### Task 3: Modify AddChapterDialog — file upload + submit flow

**Related skills:** `shadcn` (Input with type="file", Button variants, Field/FieldLabel/FieldError composition), `tanstack-query-best-practices` (useMutation for upload + createChapter), `frontend-design` (focused dialog layout with file input)

**Files:**
- Modify: `frontend/src/components/chapter/AddChapterDialog.tsx`

- [ ] **Step 1: Update imports and schema**

Add import:
```ts
import { useTranslationFileUpload } from '#/hooks/useFile'
```

Change the Zod schema — remove `url`, add `file`:
```ts
const chapterSchema = z.object({
  number: z.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File, { message: 'CBZ file is required' }),
})
```

Update default values — remove `url`:
```ts
const defaultValues: FormValues = {
  number: 1,
  title: '',
  languageId: 0,
  translatorId: 0,
}
```

- [ ] **Step 2: Add upload mutation and update submit handler**

Inside the component, after `createMutation`:
```ts
const uploadMutation = useTranslationFileUpload(mangaId)
```

Replace the `onSubmit` handler with an async function that uploads first:
```ts
onSubmit: async (values) => {
  try {
    const { url } = await uploadMutation.mutateAsync({
      file: values.value.file,
      chapterNumber: values.value.number,
    })
    createMutation.mutate(
      {
        number: values.value.number,
        title: values.value.title,
        languageId: values.value.languageId,
        translatorId: values.value.translatorId,
        url,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      },
    )
  } catch {
    // error displayed via uploadMutation.error
  }
},
```

- [ ] **Step 3: Replace the URL form field with file input**

Replace the entire `<form.Field name="url">` block with:
```tsx
<form.Field name="file">
  {(field) => (
    <UiField>
      <FieldLabel htmlFor="chapter-file" required>
        CBZ File
      </FieldLabel>
      <Input
        id="chapter-file"
        type="file"
        accept=".cbz,application/zip"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          field.handleChange(file)
        }}
        aria-invalid={field.state.meta.errors.length > 0 || undefined}
      />
      {field.state.value && (
        <p className="text-sm text-muted-foreground">{field.state.value.name}</p>
      )}
      {field.state.meta.errors.length > 0 && (
        <UiFieldError errors={field.state.meta.errors} />
      )}
    </UiField>
  )}
</form.Field>
```

- [ ] **Step 4: Add upload error display**

After the existing `createMutation.error` display block, add:
```tsx
{uploadMutation.error && (
  <p className="px-6 pb-2 text-sm text-destructive">
    {uploadMutation.error instanceof Error
      ? uploadMutation.error.message
      : 'Failed to upload file'}
  </p>
)}
```

- [ ] **Step 5: Update submit button loading state**

The submit button should be disabled when either mutation is submitting. Update the `<form.Subscribe>` selector to also track the upload state. Since can't subscribe to external state, use `isSubmitting || uploadMutation.isPending` logic in the disabled prop (uploadMutation is available in scope).

```tsx
<form.Subscribe selector={(state) => state.isSubmitting}>
  {(isSubmitting) => (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting || uploadMutation.isPending}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting || uploadMutation.isPending}>
        {isSubmitting || uploadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadMutation.isPending ? 'Uploading...' : 'Creating...'}
          </>
        ) : (
          'Create'
        )}
      </Button>
    </DialogFooter>
  )}
</form.Subscribe>
```

- [ ] **Step 6: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/chapter/AddChapterDialog.tsx
git commit -m "feat: replace url input with CBZ file upload in AddChapterDialog"
```

---

### Task 4: Modify AddTranslationDialog — file upload + submit flow

**Related skills:** `shadcn`, `tanstack-query-best-practices`, `frontend-design`

**Files:**
- Modify: `frontend/src/components/chapter/AddTranslationDialog.tsx`

- [ ] **Step 1: Update imports and schema**

Add import:
```ts
import { useTranslationFileUpload } from '#/hooks/useFile'
```

Change the Zod schema — remove `url`, add `file`:
```ts
const translationSchema = z.object({
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File, { message: 'CBZ file is required' }),
})
```

Remove `url` from default values:
```ts
const defaultValues: FormValues = {
  languageId: 0,
  translatorId: 0,
}
```

- [ ] **Step 2: Add upload mutation and update submit handler**

Inside the component, after `createMutation`:
```ts
const uploadMutation = useTranslationFileUpload(mangaId)
```

Replace the `onSubmit`:
```ts
onSubmit: async (values) => {
  try {
    const { url } = await uploadMutation.mutateAsync({
      file: values.value.file,
      chapterNumber: parseFloat(chapterNumber),
    })
    createMutation.mutate(
      {
        number: parseFloat(chapterNumber),
        title: chapterTitle ?? '',
        languageId: values.value.languageId,
        translatorId: values.value.translatorId,
        url,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      },
    )
  } catch {
    // error displayed via uploadMutation.error
  }
},
```

- [ ] **Step 3: Replace URL field with file input**

Replace the `<form.Field name="url">` block with the same file input as AddChapterDialog (with id `translation-file` instead of `chapter-file`).

- [ ] **Step 4: Add upload error display and update button**

Same pattern as AddChapterDialog: add `{uploadMutation.error && (...)}` and update button loading state to include `uploadMutation.isPending`.

- [ ] **Step 5: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chapter/AddTranslationDialog.tsx
git commit -m "feat: replace url input with CBZ file upload in AddTranslationDialog"
```

---

### Task 5: Modify EditTranslationDialog — required CBZ file upload

**Related skills:** `shadcn` (Input with type="file", Button variants, Field/FieldLabel/FieldError), `tanstack-query-best-practices` (useMutation for upload + updateTranslation)

**Files:**
- Modify: `frontend/src/components/chapter/EditTranslationDialog.tsx`

- [ ] **Step 1: Update imports, props, and schema**

Add import:
```ts
import { useTranslationFileUpload } from '#/hooks/useFile'
```

Add `chapterNumber` to the interface:
```ts
interface EditTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
  chapterId: number
  chapterNumber: number
  translation: TranslationDetail
}
```

Update Zod schema — remove `url`, make `file` required:
```ts
const translationSchema = z.object({
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File, { message: 'CBZ file is required' }),
})
```

Remove `url` from default values:
```ts
const defaultValues: FormValues = {
  languageId: translation.language.id,
  translatorId: translation.translator.id,
}
```

- [ ] **Step 2: Add upload mutation and updated submit handler**

Inside the component:
```ts
const uploadMutation = useTranslationFileUpload(mangaId)
```

Replace the `onSubmit`:
```ts
onSubmit: async (values) => {
  try {
    const { url } = await uploadMutation.mutateAsync({
      file: values.value.file,
      chapterNumber,
    })
    updateMutation.mutate(
      {
        translationId: translation.id,
        data: {
          languageId: values.value.languageId,
          translatorId: values.value.translatorId,
          url,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  } catch {
    // error displayed via uploadMutation.error
  }
},
```

- [ ] **Step 3: Replace URL field with required file input**

Replace the `<form.Field name="url">` block with:
```tsx
<form.Field name="file">
  {(field) => (
    <UiField>
      <FieldLabel htmlFor="edit-translation-file" required>
        CBZ File
      </FieldLabel>
      <div className="space-y-2">
        <Input
          id="edit-translation-file"
          type="file"
          accept=".cbz,application/zip"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            field.handleChange(file)
          }}
          aria-invalid={
            field.state.meta.errors.length > 0 || undefined
          }
        />
        {field.state.value && (
          <p className="text-sm text-muted-foreground">
            {field.state.value.name}
          </p>
        )}
      </div>
      {field.state.meta.errors.length > 0 && (
        <UiFieldError errors={field.state.meta.errors} />
      )}
    </UiField>
  )}
</form.Field>
```

- [ ] **Step 4: Add upload error display and update button**

Add after existing `updateMutation.error`:
```tsx
{uploadMutation.error && (
  <p className="px-6 pb-2 text-sm text-destructive">
    {uploadMutation.error instanceof Error
      ? uploadMutation.error.message
      : 'Failed to upload file'}
  </p>
)}
```

Update submit button:
```tsx
<form.Subscribe selector={(state) => state.isSubmitting}>
  {(isSubmitting) => (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting || uploadMutation.isPending}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting || uploadMutation.isPending}>
        {isSubmitting || uploadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadMutation.isPending ? 'Uploading...' : 'Saving...'}
          </>
        ) : (
          'Save'
        )}
      </Button>
    </DialogFooter>
  )}
</form.Subscribe>
```

- [ ] **Step 5: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chapter/EditTranslationDialog.tsx
git commit -m "feat: replace url input with required CBZ file upload in EditTranslationDialog"
```

---

### Task 6: Pass `chapterNumber` to EditTranslationDialog

**Related skills:** `tanstack-router-best-practices` (type-safe props through route components)

**Files:**
- Modify: `frontend/src/routes/admin/mangas/$id.index.tsx`

- [ ] **Step 1: Add chapterNumber prop**

At line 346, update the `<EditTranslationDialog>` usage to include `chapterNumber`:

```tsx
<EditTranslationDialog
  open={editDialogId === tr.id}
  onOpenChange={(o) =>
    setEditDialogId(o ? tr.id : null)
  }
  mangaId={Number(mangaId)}
  chapterId={chapter.id}
  chapterNumber={chapter.number}
  translation={tr}
/>
```

- [ ] **Step 2: Verify build**

```bash
cd F:\Cntt\vibe\manga-reader\frontend && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/admin/mangas/\$id.index.tsx
git commit -m "feat: pass chapterNumber prop to EditTranslationDialog"
```

---

### Self-Review Checklist

- [ ] **Spec coverage:** Every acceptance criterion maps to a task: API function (Task 1), hook (Task 2), AddChapterDialog (Task 3), AddTranslationDialog (Task 4), EditTranslationDialog (Task 5), parent prop (Task 6). Build verification ensures `npm run build` passes.
- [ ] **Placeholder scan:** No TBD, TODO, placeholder code. All code blocks contain complete implementations.
- [ ] **Type consistency:** `useTranslationFileUpload(mangaId, chapterNumber)` matches the hook definition in Task 2. `uploadTranslation(file, mangaId, chapterNumber)` matches the API function in Task 1. `EditTranslationDialogProps.chapterNumber: number` matches the parent passing `chapter.number` (a number).
