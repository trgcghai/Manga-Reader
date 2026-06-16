# MR47: Minio Client Module — Design

## Overview

Create a `FileModule` that initializes a Minio S3-compatible client from environment variables and registers it as a `@Global()` NestJS provider. On startup, verify the configured bucket exists and create it if missing.

## Module Structure

```
backend/src/modules/file/
  file.module.ts
```

## FileModule (`file.module.ts`)

- **Decorator:** `@Global()` — no need for other modules to import it
- **Provider:** A custom `useFactory` provider with token `'MINIO_CLIENT'` that:
  - Reads `MINIO_ENDPOINT` (e.g. `http://minio:9000`), parses with `new URL()` to extract hostname, port, and SSL flag
  - Reads `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`
  - Returns a `new Minio.Client({...})` instance
- **OnModuleInit:** Checks if `MINIO_BUCKET` exists via `bucketExists()`; creates it via `makeBucket()` if missing
- **Exports:** `'MINIO_CLIENT'` token

## Environment Variables

Used from `ConfigService` (loaded via `@nestjs/config`):

| Variable | Example | Source |
|---|---|---|
| `MINIO_ENDPOINT` | `http://minio:9000` | docker-compose /.env |
| `MINIO_ACCESS_KEY` | `minioadmin` | docker-compose /.env |
| `MINIO_SECRET_KEY` | `minioadmin` | docker-compose /.env |
| `MINIO_BUCKET` | `manga-pages` | docker-compose /.env |

## Changes to Existing Files

### `backend/src/app.module.ts`

Import `FileModule` and add to the `imports` array.

### `backend/.env`

Add the four `MINIO_*` variables for local development (pointing to `localhost:9000`).

## Acceptance Criteria (from task)

- [x] `minio` npm package is installed
- [x] Minio client is initialized from env vars at app startup
- [x] Bucket auto-creation on startup works (bucket is created if absent)
- [x] Minio client is injectable into other providers (e.g., `@Inject('MINIO_CLIENT')`)
- [x] Module is registered in the app
