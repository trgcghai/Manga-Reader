# MR61 + MR62: File Download Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /files/download?url=` backend endpoint (MR61) and frontend `downloadFile` API + `useFileDownload` hook (MR62).

**Architecture:** Backend controller extracts Minio key from URL → streams file → frontend consumes via axios `responseType: 'blob'` + `useMutation`.

**Tech Stack:** NestJS, Minio, axios, TanStack Query

---

### Task 1: Add `GET /files/download` Endpoint (MR61)

**Skills:** Use `nestjs-best-practices` and `nestjs-testing` skills before writing controller and tests.

**Files:**
- Modify: `backend/src/modules/file/file.controller.ts`
- Modify: `backend/src/modules/file/file.controller.spec.ts`

- [ ] **Step 1: Write the failing controller test**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\file\file.controller.spec.ts` first.

Add `download: jest.fn()` to the `mockFileService` mock object alongside existing methods (`upload`, `uploadTranslation`, `delete`, etc.).

Then add a `describe('GET /files/download', ...)` block:

```typescript
describe('GET /files/download', () => {
  it('should return StreamableFile when valid url provided', async () => {
    const mockStream = new Readable();
    mockStream.push('test-data');
    mockStream.push(null);
    const mockStreamableFile = new StreamableFile(mockStream);
    mockFileService.download.mockResolvedValue(mockStreamableFile);

    const result = await controller.download(
      'http://localhost:9000/manga-pages/manga/1/chapter/1/translations/file.cbz',
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(mockFileService.download).toHaveBeenCalledWith(
      'manga/1/chapter/1/translations/file.cbz',
    );
  });

  it('should throw BadRequestException when url is missing', async () => {
    await expect(controller.download('')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when url is not a Minio url', async () => {
    await expect(
      controller.download('https://example.com/file.cbz'),
    ).rejects.toThrow(BadRequestException);
  });
});
```

Add required imports at the top of the test file if not already present:
- `import { StreamableFile } from '@nestjs/common'`
- `import { Readable } from 'node:stream'`
- `import { BadRequestException } from '@nestjs/common'`

- [ ] **Step 2: Run controller test to verify it fails**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/file/file.controller.spec.ts --no-coverage -t "GET /files/download"`
Expected: FAIL — "controller.download is not a function"

- [ ] **Step 3: Implement the endpoint in FileController**

Add to `backend/src/modules/file/file.controller.ts`:

```typescript
import {
  Get,
  Query,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';

@Get('download')
async download(
  @Query('url') url: string,
): Promise<StreamableFile> {
  if (!url) {
    throw new BadRequestException('url query parameter is required');
  }

  const key = extractKeyFromUrl(
    url,
    this.fileService.endpoint,
    this.fileService.bucket,
  );

  if (!key) {
    throw new BadRequestException('Invalid Minio URL');
  }

  const filename = key.split('/').pop() || 'download';
  const file = await this.fileService.download(key);

  file.headers = {
    ...file.headers,
    'Content-Disposition': `attachment; filename="${filename}"`,
  };

  return file;
}
```

- [ ] **Step 4: Run controller test to verify it passes**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/file/file.controller.spec.ts --no-coverage -t "GET /files/download"`
Expected: PASS (3/3)

- [ ] **Step 5: Run full test suite**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm test`
Expected: All tests green

- [ ] **Step 6: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add backend/src/modules/file/file.controller.ts backend/src/modules/file/file.controller.spec.ts
git commit -m "feat: add GET /files/download endpoint (MR61)"
```

---

### Task 2: Add Frontend downloadFile + useFileDownload (MR62)

**Skills:** Use `tanstack-query-best-practices` skill before writing the hook.

**Files:**
- Modify: `frontend/src/services/api/fileApi.ts`
- Modify: `frontend/src/hooks/useFile.ts`

- [ ] **Step 1: Add `downloadFile` to fileApi.ts**

Add to `frontend/src/services/api/fileApi.ts` after existing functions:

```typescript
export async function downloadFile(url: string): Promise<Blob> {
  const res = await axiosInstance.get('/files/download', {
    params: { url },
    responseType: 'blob',
  })
  return res.data
}
```

- [ ] **Step 2: Add `useFileDownload` to useFile.ts**

Add to `frontend/src/hooks/useFile.ts` after existing hooks:

```typescript
import { downloadFile } from '#/services/api/fileApi'

export function useFileDownload() {
  return useMutation<Blob, Error, string>({
    mutationFn: (url: string) => downloadFile(url),
  })
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/services/api/fileApi.ts frontend/src/hooks/useFile.ts
git commit -m "feat: add downloadFile API and useFileDownload hook (MR62)"
```

---

### Task 3: Full Verification

**Skills:** Use `verification-before-completion` skill before claiming completion.

- [ ] **Step 1: Backend full test suite**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm test`
Expected: All tests green

- [ ] **Step 2: Backend TypeScript check**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Frontend build**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 4: Final commit if any fixes**

```bash
cd F:\Cntt\vibe\manga-reader
git add -A
git commit -m "chore: fix issues after MR61+MR62"
```
