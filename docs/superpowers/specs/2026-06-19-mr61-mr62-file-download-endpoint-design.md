# MR61 + MR62: File Download Endpoint (Backend + Frontend)

## Summary

Two sequential tasks: add `GET /files/download` backend endpoint (MR61), then add frontend `downloadFile` API function and `useFileDownload` hook (MR62). Together they enable the reader to download CBZ translation files from Minio through the backend.

## Architecture

```
MR61 (backend):
FileController @Get('download')
    │ @Query('url')
    ▼
extractKeyFromUrl(url, endpoint, bucket) → key | null (400)
    │
    ▼
fileService.download(key) → StreamableFile (404 if missing)
    │
    ▼
Response with Content-Disposition: attachment

MR62 (frontend):
useFileDownload() mutation
    │ mutate(url)
    ▼
downloadFile(url) → axiosInstance.get('/files/download', { params: { url }, responseType: 'blob' })
    │
    ▼
Blob → consumed by CBZ parser (MR66)
```

## Files

### MR61

| File | Action |
|------|--------|
| `backend/src/modules/file/file.controller.ts` | Add `@Get('download')` endpoint |
| `backend/src/modules/file/file.controller.spec.ts` | Add tests for the endpoint |

### MR62

| File | Action |
|------|--------|
| `frontend/src/services/api/fileApi.ts` | Add `downloadFile(url)` function |
| `frontend/src/hooks/useFile.ts` | Add `useFileDownload()` hook |

## Endpoint: `GET /files/download?url=...`

**Request:** `GET /files/download?url=http://minio:9000/bucket/path/to/file.cbz`

**Response:** Streamable file with:
- `Content-Disposition: attachment; filename="file.cbz"` (filename from last key segment)
- Content-Type from `getContentType()` (e.g., `application/octet-stream` for CBZ)

**Error handling:**

| Condition | Status |
|-----------|--------|
| Missing `url` query param | 400 Bad Request |
| URL not a Minio URL (key extraction fails) | 400 Bad Request |
| Key not found in Minio | 404 Not Found (propagated from FileService) |

## Data Flow

1. Frontend calls `useFileDownload().mutate(minioUrl)`
2. `downloadFile(url)` calls `GET /files/download?url=<minioUrl>` with `responseType: 'blob'`
3. Backend controller extracts the Minio key from the URL
4. Streams the file from Minio via `fileService.download(key)`
5. Frontend receives the Blob for further processing (e.g., CBZ extraction)

## Frontend API

```typescript
// fileApi.ts
export async function downloadFile(url: string): Promise<Blob> {
  const res = await axiosInstance.get('/files/download', {
    params: { url },
    responseType: 'blob',
  })
  return res.data
}

// useFile.ts
export function useFileDownload() {
  return useMutation<Blob, Error, string>({
    mutationFn: (url: string) => downloadFile(url),
  })
}
```
