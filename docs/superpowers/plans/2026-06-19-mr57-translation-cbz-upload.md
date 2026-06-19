# MR57 — CBZ Translation File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /files/upload/translation` endpoint accepting CBZ files with `mangaId` and `chapterNumber` fields, stored under `/manga/{mangaId}/chapter/{chapterNumber}/translations/` in Minio.

**Architecture:** New dedicated endpoint in `FileController` following the existing `uploadCover` pattern. MIME type constant in a new `translation.constant.ts`. CBZ extension mapping added to `EXT_MAP` in `FileService`. DTO for request body validation.

**Tech Stack:** NestJS, class-validator, class-transformer, Multer (FileInterceptor), Minio, Jest

---

### File Inventory

| Action | File |
|---|---|
| Create | `backend/src/common/constants/translation.constant.ts` |
| Create | `backend/src/modules/file/dto/uploadTranslationFile.dto.ts` |
| Modify | `backend/src/modules/file/file.service.ts` |
| Modify | `backend/src/modules/file/file.service.spec.ts` |
| Modify | `backend/src/modules/file/file.controller.ts` |
| Modify | `backend/src/modules/file/file.controller.spec.ts` |

---

### Task 1: Create translation MIME constant

**Related skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/common/constants/translation.constant.ts`

- [ ] **Step 1: Create the constant file**

`backend/src/common/constants/translation.constant.ts`:

```ts
export const TRANSLATION_ALLOWED_MIME_TYPES = ['application/zip'] as const;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/common/constants/translation.constant.ts
git commit -m "feat: add translation MIME type constant"
```

---

### Task 2: Extend EXT_MAP in FileService + test

**Related skills:** `nestjs-best-practices`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/file/file.service.ts:15-20`
- Modify: `backend/src/modules/file/file.service.spec.ts`

- [ ] **Step 1: Write failing test for .cbz extension mapping**

In `file.service.spec.ts`, add after the existing `describe('upload')` block:

```ts
it('should map application/zip to .cbz extension', async () => {
  mockMinioClient.putObject.mockResolvedValue({
    etag: '"abc123"',
    versionId: null,
  });
  const result = await service.upload('prefix', Buffer.from('data'), 'application/zip');
  expect(result.key).toMatch(/\.cbz$/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/file.service.spec.ts --verbose
```

Expected: FAIL — the test passes PUT but the key ends in `.bin` (default fallback) instead of `.cbz`.

- [ ] **Step 3: Add `application/zip` to EXT_MAP**

In `backend/src/modules/file/file.service.ts`, add to the `EXT_MAP` object:

```ts
'application/zip': 'cbz',
```

So the full map becomes:

```ts
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'cbz',
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest src/modules/file/file.service.spec.ts --verbose
```

Expected: PASS — both existing tests and the new .cbz extension test pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/file.service.ts backend/src/modules/file/file.service.spec.ts
git commit -m "feat: map application/zip to .cbz extension in FileService"
```

---

### Task 3: Create UploadTranslationFileDto

**Related skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/file/dto/uploadTranslationFile.dto.ts`

- [ ] **Step 1: Create the DTO**

`backend/src/modules/file/dto/uploadTranslationFile.dto.ts`:

```ts
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadTranslationFileDto {
  @IsNumber()
  @Type(() => Number)
  mangaId: number;

  @IsNumber()
  @Type(() => Number)
  chapterNumber: number;
}
```

`@Type(() => Number)` is required because multer form fields are always strings; the global `ValidationPipe` with `transform: true` will apply this decorator to coerce values.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/file/dto/uploadTranslationFile.dto.ts
git commit -m "feat: add UploadTranslationFileDto"
```

---

### Task 4: Add endpoint to FileController + test

**Related skills:** `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/file/file.controller.ts`
- Modify: `backend/src/modules/file/file.controller.spec.ts`

- [ ] **Step 1: Write failing test for the new endpoint**

In `file.controller.spec.ts`, add after the existing `describe('POST /files/upload/cover')` block:

```ts
describe('POST /files/upload/translation', () => {
  it('should upload translation file with mangaId and chapterNumber', async () => {
    const mockResult = {
      key: '/manga/1/chapter/3/translations/uuid.cbz',
      url: 'http://localhost:9000/manga-pages/manga/1/chapter/3/translations/uuid.cbz',
    };
    mockFileService.upload.mockResolvedValue(mockResult);

    const file = {
      originalname: 'chapter.cbz',
      buffer: Buffer.from('test'),
      mimetype: 'application/zip',
    } as Express.Multer.File;

    const dto = { mangaId: 1, chapterNumber: 3 };

    const result = await controller.uploadTranslation(file, dto);
    expect(result).toEqual(mockResult);
    expect(mockFileService.upload).toHaveBeenCalledWith(
      '/manga/1/chapter/3/translations',
      file.buffer,
      file.mimetype,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/file.controller.spec.ts --verbose
```

Expected: FAIL with "uploadTranslation does not exist on FileController".

- [ ] **Step 3: Add the endpoint to FileController**

`backend/src/modules/file/file.controller.ts` — add import and endpoint:

```ts
import { Body } from '@nestjs/common';
```

Add after `uploadCover`:

```ts
@Post('upload/translation')
@UseInterceptors(FileInterceptor('file'))
async uploadTranslation(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 }),
        new FileTypeValidator({
          fileType: /^application\/zip$/,
        }),
      ],
    }),
  )
  file: Express.Multer.File,
  @Body() dto: UploadTranslationFileDto,
) {
  const prefix = `/manga/${dto.mangaId}/chapter/${dto.chapterNumber}/translations`;
  return this.fileService.upload(prefix, file.buffer, file.mimetype);
}
```

And add the import at the top:

```ts
import { UploadTranslationFileDto } from './dto/uploadTranslationFile.dto';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest src/modules/file/file.controller.spec.ts --verbose
```

Expected: PASS — both existing tests and the new translation upload test pass.

- [ ] **Step 5: Run full test suite**

```bash
cd backend && npm test
```

Expected: All tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/file/file.controller.ts backend/src/modules/file/file.controller.spec.ts
git commit -m "feat: add POST /files/upload/translation endpoint for CBZ upload"
```

---

### Self-Review Checklist

- [ ] **Spec coverage:** All acceptance criteria from the spec are covered by tests: DTO validation (covered by ValidationPipe), file size (covered by MaxFileSizeValidator), file type (covered by FileTypeValidator), prefix construction (covered by controller test assertion).
- [ ] **Placeholder scan:** No TBD, TODO, placeholder code, or empty steps.
- [ ] **Type consistency:** `UploadTranslationFileDto` with `mangaId: number` and `chapterNumber: number` matches the controller's destructuring `dto.mangaId` / `dto.chapterNumber`. Prefix string template uses `dto.chapterNumber` consistently.
