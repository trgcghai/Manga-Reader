# MR48: File Service — Design

## Overview

Create a `FileService` that wraps Minio operations for storing and retrieving manga images. Builds on the `MINIO_CLIENT` provider from MR47.

## Service Structure

```
backend/src/modules/file/
  file.module.ts              ← add FileService to providers
  services/
    file.service.ts           ← new
    file.service.spec.ts      ← new (TDD)
```

## FileService

**Dependency:** `@Inject(MINIO_CLIENT) Minio.Client`

### Methods

| Method | Params | Returns |
|---|---|---|
| `upload` | `prefix: string, buffer: Buffer, mimetype: string` | `Promise<string>` — full public URL |
| `download` | `key: string` | `Promise<StreamableFile>` |
| `delete` | `key: string` | `Promise<void>` |
| `list` | `prefix?: string` | `Promise<string[]>` |

### upload

- Generates a UUID-based filename using `crypto.randomUUID()`, preserving the extension from `mimetype`
- Constructs key as `{prefix}/{uuid}.{ext}`
- Uploads to Minio via `minioClient.putObject(bucket, key, buffer, { 'Content-Type': mimetype })`
- Returns full URL: `{MINIO_ENDPOINT}/{MINIO_BUCKET}/{key}`

### download

- Calls `minioClient.getObject(bucket, key)`
- Determines Content-Type from file extension
- Returns `new StreamableFile(stream, { type: contentType })`

### delete

- Calls `minioClient.removeObject(bucket, key)`

### list

- Calls `minioClient.listObjects(bucket, prefix, true)`
- Collects all object keys from the stream into an array

### Error handling

- `NoSuchKey` / `NotFound` errors → `NotFoundException`
- All other Minio errors → `InternalServerErrorException`
- Uses `try/catch` in every method

### MIME type resolution

Use a simple map for common image types:
- `.jpg`/`.jpeg` → `image/jpeg`
- `.png` → `image/png`
- `.webp` → `image/webp`
- Default → `application/octet-stream`

## Testing Strategy (TDD + Whitebox)

### Test file

```
backend/src/modules/file/services/file.service.spec.ts  ← new
```

### Approach

- **Whitebox:** we know `FileService` depends on `Minio.Client`. Mock the client to control all Minio responses without network I/O.
- **TDD:** write the failing test first, then implement the minimal code to pass it.
- Coverage: success paths, Minio error mapping, edge cases, and the MIME resolver.

### Mock setup

Create a mock `Minio.Client` object with `jest.fn()` for each method (`putObject`, `getObject`, `removeObject`, `listObjects`). The mock `listObjects` returns a `Readable` stream per Minio's API.

Inject the mock via `{ provide: MINIO_CLIENT, useValue: mockClient }`.

### Test cases

#### upload

| Test | Arrange | Assert |
|---|---|---|
| stores file and returns URL | mock `putObject` resolves | expect `putObject` called with bucket, key, buffer, metadata; returns URL like `http://minio:9000/manga-pages/covers/uuid.jpg` |
| propagates Minio error | mock `putObject` rejects with `Error("connection lost")` | rejects with `InternalServerErrorException` |
| handles unknown mimetype | buffer + `mimetype: 'application/octet-stream'` | filename has no extension; `putObject` called without content-type metadata |

#### download

| Test | Arrange | Assert |
|---|---|---|
| returns StreamableFile for found key | mock `getObject` returns a `Readable` stream | returns `StreamableFile` instance; contentType derived from key's extension |
| throws NotFound on NoSuchKey | mock `getObject` rejects with `{ code: 'NoSuchKey' }` | rejects with `NotFoundException` |
| throws InternalError on other Minio failure | mock `getObject` rejects with `Error("timeout")` | rejects with `InternalServerErrorException` |

#### delete

| Test | Arrange | Assert |
|---|---|---|
| removes object | mock `removeObject` resolves | expect `removeObject` called with bucket and key |
| propagates Minio error | mock `removeObject` rejects | rejects with `InternalServerErrorException` |

#### list

| Test | Arrange | Assert |
|---|---|---|
| returns all keys with no prefix | mock `listObjects` returns stream emitting 3 objects | resolves to `['a.jpg', 'b.jpg', 'c.jpg']` |
| returns filtered keys with prefix | mock `listObjects` called with prefix | resolves to keys under that prefix |
| propagates Minio error | mock `listObjects` stream emits error | rejects with `InternalServerErrorException` |

#### MIME type resolution (unit-tested as private helper or extracted function)

| Extension | Expected |
|---|---|
| `jpg` / `jpeg` | `image/jpeg` |
| `png` | `image/png` |
| `webp` | `image/webp` |
| (unknown) | `application/octet-stream` |

## File Module Changes

Add `FileService` to the `providers` array in `file.module.ts`. No need to export it — the module is `@Global()`, so any service can inject it.

## Acceptance Criteria

- [x] `FileService` is injectable with `MinioClient` dependency
- [x] `upload` stores a file buffer to Minio and returns its key
- [x] `download` retrieves a file as a readable stream
- [x] `delete` removes a file from Minio
- [x] `list` returns files under a given prefix
- [x] Errors are wrapped in NestJS `HttpException` with appropriate status codes
- [x] Service is registered in the file module
