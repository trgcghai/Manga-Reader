# MR50: File Upload for Create/Edit Manga Flow

## Summary

Replace the text-based `coverPath` input in `MangaForm` with a file picker that uploads to Minio before form submission. Both create and edit pages get the upload flow.

## Architecture

```
MangaForm (file input + preview)
    │ onSubmit(values, coverRemoved)
    ▼
new.tsx / edit.tsx
    │
    ├─ if coverFile    → useFileUpload() mutateAsync → get { url } → set coverPath
    ├─ if coverRemoved → set coverPath = '' (edit only)
    └─ else            → omit coverPath from payload
    │
    ▼
useCreateManga / useUpdateManga mutation
```

## Files

### New: `frontend/src/services/api/fileApi.ts`

- `uploadFile(file: File): Promise<{ key: string; url: string }>`
- POSTs multipart/form-data to `/files/upload`
- Follows `importMangas` pattern (FormData + per-request content-type header)

### New: `frontend/src/hooks/useFile.ts`

- `useFileUpload()` returns `useMutation<{ key: string; url: string }, Error, File>`
- No toast or cache invalidation (upload is transient within a larger flow)

### Modified: `frontend/src/components/manga/MangaForm.tsx`

Schema additions:
- `coverFile: z.instanceof(File).nullable().optional()` — holds selected file
- `coverPath` stays as `z.string()` for edit's existing URL display

UI changes to cover section:
- Dropzone / click-to-upload `<input type="file">` with `accept="image/jpeg,image/png,image/webp,image/gif"`
- On create: empty area with prompt text
- On edit: shows existing `coverPath` as preview thumbnail
- Selecting new file: shows local File preview, marks `coverFile`
- "Remove" button (edit only): clears preview, sets `coverRemoved` (local state, not in schema)
- Sequential submit button labels: "Uploading..." → "Saving..."

`onSubmit` signature changes from `(values: FormValues) => void` to `(values: FormValues, coverRemoved: boolean) => void`.

### Modified: `frontend/src/routes/admin/mangas/new.tsx`

- `onSubmit` becomes `async`
- If `value.coverFile` exists: `await uploadMutation.mutateAsync(value.coverFile)` → get `url`, set as `coverPath`
- Pass `coverPath` in `CreateMangaPayload`
- Error handling: try/catch, set form error message from upload or mutation failure

### Modified: `frontend/src/routes/admin/mangas/$id.edit.tsx`

- Same upload logic as new.tsx
- Additional: if `coverRemoved`, set `coverPath: ''`
- If no cover change, omit `coverPath` from `UpdateMangaPayload`

### Modified: `backend/src/modules/manga/services/manga.service.ts`

- Line 163: change `if (dto.coverPath)` to `if (dto.coverPath !== undefined)` so empty string clears the field

## Error Handling

1. File too large / wrong type: backend returns 400, error displays on form
2. Upload network failure: caught in try/catch, form shows error message
3. Create/update mutation failure: existing error prop already handles this
4. File selection validation: `accept` attribute prevents wrong types client-side

## Testing

| Test file | Coverage |
|-----------|----------|
| `fileApi.spec.ts` | `uploadFile` calls correct endpoint, sends FormData |
| `useFile.spec.ts` | mutation loading/error/success states |
| `MangaForm.spec.tsx` | file input renders, preview shows, remove clears |
| `new.spec.tsx` or `edit.spec.tsx` | upload-then-submit sequence (optional, integration) |
