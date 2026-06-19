# MR58 — Frontend: Replace URL Text Input with CBZ File Upload in Translation Dialogs

## Overview

Replace the `url` text input in AddChapterDialog, AddTranslationDialog, and EditTranslationDialog with a CBZ file upload. Each dialog uploads the file first via `POST /files/upload/translation` (MR57), gets the URL, then proceeds with create/update.

## Files Changed

### Modified files

| File | Change |
|---|---|
| `frontend/src/services/api/fileApi.ts` | Add `uploadTranslation(file, mangaId, chapterNumber)` function |
| `frontend/src/hooks/useFile.ts` | Add `useTranslationFileUpload(mangaId, chapterNumber)` hook |
| `frontend/src/components/chapter/AddChapterDialog.tsx` | Replace `url` field with file input; upload-first submit flow |
| `frontend/src/components/chapter/AddTranslationDialog.tsx` | Same |
| `frontend/src/components/chapter/EditTranslationDialog.tsx` | Add `chapterNumber` prop; replace `url` field with file input + Replace pattern |
| `frontend/src/routes/admin/mangas/$id.index.tsx` | Pass `chapterNumber` to `EditTranslationDialog` |

## Design

### 1. API layer — `fileApi.ts`

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

### 2. Hook — `useFile.ts`

```ts
export function useTranslationFileUpload(
  mangaId: number,
  chapterNumber: number,
) {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadTranslation(file, mangaId, chapterNumber),
  })
}
```

### 3. AddChapterDialog

**Schema:** Remove `url`, add `file: z.instanceof(File, { message: 'CBZ file is required' })`.

**Submit flow:**
1. Upload file via `useTranslationFileUpload(mangaId, values.number)`
2. On success → get `url` from response
3. Call `createChapter(mangaId, { number, title, languageId, translatorId, url })`
4. On error → show upload error in the dialog

**UI:** Replace the `<form.Field name="url">` block with:

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
      />
      {field.state.value && (
        <p className="text-sm text-muted-foreground">
          {field.state.value.name}
        </p>
      )}
      {field.state.meta.errors.length > 0 && (
        <UiFieldError errors={field.state.meta.errors} />
      )}
    </UiField>
  )}
</form.Field>
```

### 4. AddTranslationDialog

**Schema:** Same as AddChapterDialog — remove `url`, add `file`.

**Submit flow:**
1. Upload file via `useTranslationFileUpload(mangaId, chapterNumber)` (chapterNumber from props)
2. On success → get `url`
3. Call `createChapter(mangaId, { number: parseFloat(chapterNumber), title: chapterTitle ?? '', languageId, translatorId, url })`

**UI:** Same file input as AddChapterDialog, replacing the `url` field.

### 5. EditTranslationDialog

**Props:** Add `chapterNumber: number` to the interface.

**Schema:** Remove `url`, add required `file: z.instanceof(File, { message: 'CBZ file is required' })`.

**Submit flow:**
1. Upload file via `useTranslationFileUpload(mangaId)` → get URL
2. Call `updateTranslation` with `{ languageId, translatorId, url }`

**UI:** Same file input as AddChapterDialog — always shown, required field.

### 6. Error handling

- Upload failure → display error message in the dialog (same pattern as existing `createMutation.error`)
- `useMutation` `onError` callback sets a local error state shown below the form
- The form's submit button loading state accounts for both upload + mutation

### 7. Validation

- `file` field required in AddChapterDialog and AddTranslationDialog (Zod `instanceof(File)`)
- `file` field optional in EditTranslationDialog (nullable + optional)
- File input `accept` attribute restricts to `.cbz` and `application/zip` on the client side
- Server-side validation (15MB, CBZ only) is handled by MR57's `ParseFilePipe`

## Acceptance Criteria

- [ ] `uploadTranslation()` function exists in `fileApi.ts`
- [ ] `useTranslationFileUpload(mangaId, chapterNumber)` hook exists in `useFile.ts`
- [ ] AddChapterDialog: user selects CBZ file → on submit, file uploaded → URL passed to chapter creation
- [ ] AddTranslationDialog: same flow as AddChapterDialog using props for chapterNumber
- [ ] EditTranslationDialog: receives `chapterNumber` prop from parent
- [ ] EditTranslationDialog: user selects a new CBZ file → on submit, file is uploaded → URL is passed to translation update
- [ ] EditTranslationDialog: file input is always shown (no "Replace" pattern); CBZ file is always required
- [ ] Text `url` input removed from all three dialogs
- [ ] Zod schema no longer validates `url` — validates file type instead
- [ ] `cd frontend && npm run build` passes with 0 errors
