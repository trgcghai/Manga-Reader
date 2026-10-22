# MR99: Backend — Presigned Upload URL Generation

## Overview

Replace the proxy upload flow (frontend → backend → MinIO) with a presigned URL flow (frontend → backend → frontend → MinIO). The backend validates file metadata, generates a presigned PUT URL, and returns it along with the object key. The frontend uploads directly to MinIO, then stores only the key (not a full URL) in the entity.

Old upload endpoints remain in place. Download/display flow is deferred to future tasks.

## Data Flow

```
Frontend                     Backend                      MinIO
   |                           |                            |
   |-- POST /files/presigned-upload/cover -->|              |
   |   { contentType, fileSize }             |              |
   |                           |-- presignedPutObject() -->|
   |                           |<--- { uploadUrl } --------|
   |<-- { uploadUrl, key, expiresIn } --|                  |
   |                           |                            |
   |-- PUT {uploadUrl} (file) --------------------------->|
   |                           |                            |
   |-- POST /manga (with coverKey) -->|                    |
```

## FileService Changes

### `generatePresignedUploadUrl()`

```typescript
async generatePresignedUploadUrl(
  prefix: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }>
```

- Looks up `contentType` in existing `EXT_MAP` to derive file extension
- Rejects with error if `contentType` not in `EXT_MAP`
- Generates UUID key: `${prefix}/${uuid}.${EXT_MAP[contentType]}`
- Calls `minioClient.presignedPutObject(bucket, key, 3600, { contentType })`
- Returns `{ uploadUrl, key, expiresIn: 3600 }`

The `EXT_MAP` in `file.service.ts` currently covers: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/zip`. Add `application/vnd.comicbook+zip` if not present.

### Existing methods

`upload()`, `uploadTranslation()`, `download()`, `delete()`, `list()` — all unchanged.

## Controller Endpoints

### `POST /files/presigned-upload/cover`

- **Body:** `{ contentType: string, fileSize: number }`
- **Validation:**
  - `contentType` must be one of: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - `fileSize` must be ≤ 10 MB
- **Response (201):** `{ uploadUrl: string, key: string, expiresIn: number }`
- **Errors:** 400 for invalid type or oversized file

### `POST /files/presigned-upload/translation`

- **Body:** `{ mangaId: number, chapterNumber: number, contentType: string, fileSize: number }`
- **Validation:**
  - `contentType` must be one of: `application/zip`, `application/x-cbz`, `application/vnd.comicbook+zip`
  - `fileSize` must be ≤ 100 MB
- **Response (201):** `{ uploadUrl: string, key: string, expiresIn: number }`
- **Errors:** 400 for invalid type or oversized file

Prefix format (mirrors current pattern): `manga/${mangaId}/chapter/${chapterNumber}/translations`

Both endpoints call `FileService.generatePresignedUploadUrl()` with the appropriate prefix.

### Swagger

New endpoints get `@ApiTags('Files')`, `@ApiOperation()`, `@ApiBody()` DTOs, and `@ApiResponse()` decorators.

## Entity / DTO / Service Renames

### Entity columns

| Entity | Old field | New field |
|--------|-----------|-----------|
| `Manga` | `coverPath` | `coverKey` |
| `Translation` | `url` | `key` |

### DTOs

| DTO | Old field | New field |
|-----|-----------|-----------|
| `CreateMangaDto` | `coverPath` | `coverKey` |
| `UpdateMangaDto` | `coverPath` | `coverKey` |
| `MangaResponse` | `coverPath` | `coverKey` |
| `CreateChapterDto` | `url` | `key` |
| `UpdateTranslationDto` | `url` | `key` |
| `TranslationDetailResponse` | `url` | `key` |
| `ChapterTranslationResponse` | `url` | `key` |

`ImportChapterRowDto` has `File: string` — not affected.

### Services (reference count)

| Service | File | References |
|---------|------|------------|
| `manga.service.ts` | `coverPath` | ~6 refs (create, update, delete, findOne) |
| `chapter.service.ts` | `.url` | ~2 refs (create) |
| `translation.service.ts` | `.url` | ~5 refs (findOne, update, delete) |
| `import-manga.service.ts` | `coverPath` | ~2 refs (read row, pass to DTO) |
| `manga.repository.ts` | `coverPath` | ~2 refs (update) |

Update `extractKeyFromUrl` calls in services that check for MinIO URL prefix — these become key-only operations in future tasks but keep using the same utility for now since old endpoints remain.

### Test files

Update all spec files referencing `coverPath` or `.url`:

`file.service.spec.ts`, `file.controller.spec.ts`, `file.module.spec.ts`,
`manga.service.spec.ts`, `chapter.service.spec.ts`, `translation.service.spec.ts`,
`manga.repository.spec.ts`, `translation.repository.spec.ts`.

## Migration

Create a TypeORM migration that:

1. Renames column `manga.coverPath` → `manga.coverKey`
2. Renames column `translation.url` → `translation.key`
3. Strips the URL prefix from existing values to extract just the key

The prefix follows the pattern `{endpoint}/{bucket}/`. For known values:
- Uses `MINIO_ENDPOINT` and `MINIO_BUCKET` from config at migration runtime
- Regex: strip everything up to and including `/bucket/`
- Example: `http://host:9000/manga-bucket/manga/cover/uuid.jpg` → `manga/cover/uuid.jpg`
- Example: `http://host:9000/manga-bucket/manga/1/ch/1/uuid.zip` → `manga/1/ch/1/uuid.zip`

Values that don't match the pattern (shouldn't exist in practice) are left as-is.

## What Stays Unchanged

- `POST /files/upload/cover` and `POST /files/upload/translation` (old proxy upload)
- `GET /files/download?url=` (proxied download — deferred to future task)
- `DELETE /files/:key` (unchanged since it already uses a key param)
- `FileService.upload()`, `FileService.uploadTranslation()`, `FileService.download()`, `FileService.delete()` methods
- All frontend code

## Error Scenarios

| Scenario | Endpoint | Status | Body |
|----------|----------|--------|------|
| Unsupported image MIME | `cover` | 400 | `{ message: "...", error: "Bad Request" }` |
| Image over 10 MB | `cover` | 400 | `{ message: "...", error: "Bad Request" }` |
| Unsupported translation MIME | `translation` | 400 | `{ message: "...", error: "Bad Request" }` |
| Translation over 100 MB | `translation` | 400 | `{ message: "...", error: "Bad Request" }` |
| Missing `mangaId`/`chapterNumber` | `translation` | 400 | validation pipe error |
| MinIO unreachable | both | 502 | `{ message: "Upload service unavailable" }` |

## Testing Strategy

- **Unit (`FileService`):** Mock `minioClient.presignedPutObject`. Verify it's called with bucket, key, expiry, contentType. Verify `EXT_MAP` lookup works.
- **Unit (`FileController`):** Mock `FileService`. Verify validation gates (MIME, fileSize) return 400. Verify success returns `{ uploadUrl, key, expiresIn }`.
- **Service specs:** Update existing specs where MockManga/MockTranslation use `coverPath`/`url` → `coverKey`/`key`.
- All existing tests must still pass.

## Acceptance Criteria

- [ ] `FileService.generatePresignedUploadUrl()` produces valid presigned PUT URLs via `presignedPutObject`
- [ ] `EXT_MAP` drives the file extension in the generated key
- [ ] Return type includes `expiresIn`
- [ ] `POST /files/presigned-upload/cover` rejects invalid image types with 400
- [ ] `POST /files/presigned-upload/cover` rejects files over 10 MB with 400
- [ ] `POST /files/presigned-upload/translation` rejects non-zip types with 400
- [ ] `POST /files/presigned-upload/translation` rejects files over 100 MB with 400
- [ ] Both endpoints return `{ uploadUrl, key, expiresIn }`
- [ ] Entity column `coverPath` renamed to `coverKey` in DB
- [ ] Entity column `url` renamed to `key` in DB
- [ ] Existing `coverPath` values migrated to keys (prefix stripped)
- [ ] Existing `translation.url` values migrated to keys (prefix stripped)
- [ ] All backend services use `coverKey`/`key` field names consistently
- [ ] All tests pass
- [ ] Backend build succeeds (`npm run build`)
- [ ] Swagger docs list new endpoints and updated DTO fields
