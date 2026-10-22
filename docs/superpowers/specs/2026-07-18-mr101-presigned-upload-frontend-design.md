# MR101: Frontend — Direct Upload via Presigned URLs

## Overview

Replace the proxy upload flow (frontend → backend → MinIO) with direct browser-to-MinIO uploads using presigned PUT URLs. Also renames `coverPath` → `coverKey` and `url` → `key` across all frontend types and components to match the backend DTOs (MR99).

## New Upload Flow

1. Frontend calls `POST /files/presigned-upload/cover` (or `/translation`) with file metadata
2. Backend validates and returns `{ uploadUrl, key, expiresIn }`
3. Frontend PUTs the file directly to `uploadUrl` with correct `Content-Type` using `fetch`
4. Frontend passes `key` to `createChapter` / `updateManga` / `createManga`

## Changes by Layer

### 1. API Layer — `fileApi.ts`

```typescript
export async function generatePresignedCoverUpload(
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }>

export async function generatePresignedTranslationUpload(
  contentType: string,
  fileSize: number,
  mangaId: number,
  chapterNumber: number,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }>

export async function uploadFileDirectly(
  uploadUrl: string,
  file: File,
): Promise<void>

export type UploadFileResponse = { key: string } // url removed
```

- `generatePresignedCoverUpload` → `POST /files/presigned-upload/cover` with `{ contentType, fileSize }`
- `generatePresignedTranslationUpload` → `POST /files/presigned-upload/translation` with `{ contentType, fileSize, mangaId, chapterNumber }`
- `uploadFileDirectly` → raw `fetch` PUT to presigned URL (avoid axios interceptor overhead)

### 2. API Layer — `mangaApi.ts` (field renames)

| Interface | Old Field | New Field |
|---|---|---|
| `MangaResponse` | `coverPath: string` | `coverKey: string` |
| `CreateMangaPayload` | `coverPath?: string` | `coverKey?: string` |
| `TranslationDetail` | `url: string` | `key: string` |
| `CreateChapterPayload` | `url: string` | `key: string` |
| `TranslationDetailResponse` | `url: string` | `key: string` |
| `UpdateTranslationPayload` | `url?: string` | `key?: string` |

`UpdateMangaPayload = Partial<CreateMangaPayload>` auto-updates.

### 3. Hooks — `useFile.ts`

- `useCoverUpload()`: two-step flow → `generatePresignedCoverUpload()` → `uploadFileDirectly()` → return `{ key }`
- `useTranslationFileUpload()`: two-step flow → `generatePresignedTranslationUpload()` → `uploadFileDirectly()` → return `{ key }`
- `useFileDownload()`: unchanged (MR102 handles download)

### 4. Hooks — `useBatchImport.ts`

- Replace `uploadTranslation()` call with presigned upload flow
- Pass `key` to `createChapter()` instead of `url`

### 5. Display Components (pure field renames)

| Component | Change |
|---|---|
| `MangaCard.tsx` | `manga.coverPath` → `manga.coverKey` (2 occurrences) |
| `MangaDetailHeader.tsx` | `manga.coverPath` → `manga.coverKey` (2 occurrences) |
| `$id.index.tsx` | `manga.coverPath` → `manga.coverKey`, `tr.url` → `tr.key`, download handler uses `tr.key` |

### 6. Form Components (upload flow + renames)

| Component | Changes |
|---|---|
| `MangaForm.tsx` | Form schema `coverPath` → `coverKey`, default values `coverPath` → `coverKey` |
| `$id.edit.tsx` | Upload returns `key` instead of `url`, `payload.coverPath` → `payload.coverKey` |
| `new.tsx` | Upload returns `key` instead of `url`, `payload.coverPath` → `payload.coverKey` |
| `AddChapterDialog.tsx` | Upload returns `key`, pass `key` to `CreateChapterPayload` |
| `AddTranslationDialog.tsx` | Upload returns `key`, pass `key` to `CreateChapterPayload` |
| `EditTranslationDialog.tsx` | `translation.url` → `translation.key`, `payload.url` → `payload.key` |
| `$id.index.tsx` download handler | Use `tr.key` to pass to download, download URL display uses `tr.key` |

### 7. Error Handling

- Presigned URL generation failure → error toast (existing pattern from `useMutation`)
- Direct PUT failure → error toast with retry (mutation allows retry)
- No progress tracking (follows current pattern — spinner/loading text only)

## Files Modified

```
frontend/src/services/api/fileApi.ts
frontend/src/services/api/mangaApi.ts
frontend/src/hooks/useFile.ts
frontend/src/hooks/useBatchImport.ts
frontend/src/components/manga/MangaCard.tsx
frontend/src/components/manga/MangaDetailHeader.tsx
frontend/src/components/manga/MangaForm.tsx
frontend/src/components/chapter/AddChapterDialog.tsx
frontend/src/components/chapter/AddTranslationDialog.tsx
frontend/src/components/chapter/EditTranslationDialog.tsx
frontend/src/routes/admin/mangas/$id.edit.tsx
frontend/src/routes/admin/mangas/$id.index.tsx
frontend/src/routes/admin/mangas/new.tsx
```

## Acceptance Criteria

- [ ] Cover images upload directly to MinIO via presigned URL
- [ ] Translation files upload directly to MinIO via presigned URL
- [ ] Batch import processes all files using presigned uploads sequentially
- [ ] `CreateChapterPayload` uses `key` (not `url`)
- [ ] `CreateMangaPayload` uses `coverKey` (not `coverPath`)
- [ ] `MangaResponse` has `coverKey` instead of `coverPath`
- [ ] `TranslationDetail` has `key` instead of `url`
- [ ] All components using `manga.coverPath` updated to `manga.coverKey`
- [ ] All components using `translation.url` updated to `translation.key`
- [ ] Failed presigned URL generation shows error toast
- [ ] Failed direct PUT shows error toast with retry
- [ ] No regressions in cover, translation, batch import, or edit flows
- [ ] Frontend build + tests pass
