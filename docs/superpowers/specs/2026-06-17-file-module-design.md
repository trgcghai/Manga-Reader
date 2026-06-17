# File Storage Module (MR47–49)

## Overview

Build a NestJS file storage module backed by Minio (S3-compatible) for manga covers, chapter pages, and thumbnails. Three sequential tasks: Minio client setup, FileService wrapper, and REST controller.

## Architecture

```
Client (HTTP)
   │
   ▼
FileController ──► FileService ──► Minio.Client
                       │
                       ▼
               file-mime.util.ts
```

FileModule is `@Global()` — registered once in `app.module.ts`. Only `FileService` is exported; `MinioClient` is an internal custom provider.

## Directory Structure

```
backend/src/
├── common/
│   ├── constants/
│   │   └── chapter.constant.ts    # +ALLOWED_MIME_TYPES added here
│   └── utils/
│       └── file-mime.util.ts      # getContentType(key) → MIME string
└── modules/
    └── file/
        ├── file.module.ts         # @Global(), MinioClient provider + bucket check
        ├── file.service.ts        # upload, download, delete, list
        └── file.controller.ts     # POST /files/upload, DELETE /files/:key
```

## FileModule & MinioClient

- **file.module.ts** — `@Global()` module. Provides `'MINIO_CLIENT'` via `useFactory` reading `ConfigService`:
  - `MINIO_ENDPOINT` → parsed URL (hostname, port, useSSL)
  - `MINIO_ACCESS_KEY`
  - `MINIO_SECRET_KEY`
  - All env vars validated at startup (fail-fast if missing)
- **onModuleInit**: Check bucket (`MINIO_BUCKET`) exists; create it with `us-east-1` region if missing. Log result.
- **Exports**: Only `FileService`. `'MINIO_CLIENT'` is module-private.
- **Register** in `app.module.ts` imports array.

## FileService

Single file `file.service.ts` in `modules/file/`.

| Method | Signature | Returns | Behavior |
|--------|-----------|---------|----------|
| `upload` | `(prefix: string, buffer: Buffer, mimetype: string)` | `{ key: string, url: string }` | Generates `{prefix}/{uuid}.{ext}`, stores via `putObject`, returns object with key and full Minio URL |
| `download` | `(key: string)` | `StreamableFile` | Streams from Minio with correct Content-Type from `file-mime.util.ts` |
| `delete` | `(key: string)` | `void` | Removes object. `NoSuchKey`/`NotFound` → `NotFoundException`. |
| `list` | `(prefix?: string)` | `string[]` | Async iterates `listObjects`, returns key names |

**Key format**: `{prefix}/{uuid}.{ext}` — e.g., `covers/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`

**Extension map**: Determined from `mimetype`:
- `image/jpeg` → `jpg` (not `jpeg`)
- `image/png` → `png`
- `image/webp` → `webp`
- Unknown → `bin`

**Error handling**: All Minio errors are caught, logged via `Logger`, and re-thrown as NestJS HTTP exceptions (404 for missing, 500 for others).

## FileController

REST at `/files`:

| Method | Path | Description | Validation |
|--------|------|-------------|------------|
| `POST` | `/files/upload` | Upload multipart file, store via FileService | `FileInterceptor('file')`, 10MB max, MIME from `chapter.constant.ts` `ALLOWED_MIME_TYPES` |
| `DELETE` | `/files/:key*` | Delete file by key | Captures full key including slashes |

**POST response**: `{ key: string, url: string }` where `url` is the full Minio URL.

**DELETE path**: Uses Express wildcard `:key*` to capture keys with slashes (e.g., `covers/uuid.jpg`).

**No GET endpoint**: Upload returns `{ key, url }` with the full Minio URL; clients load images directly from Minio, not proxied through the backend.

## MIME Type Validation

Add `ALLOWED_MIME_TYPES` to `chapter.constant.ts` alongside existing `SUPPORTED_IMAGE_EXTENSIONS`:

```ts
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
```

Controller imports this and passes to `ParseFilePipe` / `FileTypeValidator`.

## file-mime.util.ts

Global utility in `common/utils/`. Maps file extensions to MIME types for streaming responses:

```ts
export function getContentType(key: string): string;
```

- `jpg|jpeg` → `image/jpeg`
- `png` → `image/png`
- `webp` → `image/webp`
- Default → `application/octet-stream`

## Configuration

| Env Var | Example | Required |
|---------|---------|----------|
| `MINIO_ENDPOINT` | `http://localhost:9000` | Yes |
| `MINIO_ACCESS_KEY` | `minioadmin` | Yes |
| `MINIO_SECRET_KEY` | `minioadmin` | Yes |
| `MINIO_BUCKET` | `manga-pages` | Yes |

All four already defined in `.env` and `docker-compose.yml`.

## Testing Strategy

- **Unit**: FileService with mocked `Minio.Client` — test upload, download, delete, list, error wrapping
- **Unit**: file-mime.util — test extension-to-MIME mapping
- **Controller**: Test with `supertest` against a Nest testing module with mock FileService
- **E2E**: Optional — requires running Minio container
