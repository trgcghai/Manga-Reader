# MR57 — Backend: CBZ Translation File Upload Endpoint

## Overview

Add `POST /files/upload/translation` to the existing `FileController` for uploading CBZ translation files to Minio. Follows the same pattern as the existing `POST /files/upload/cover` endpoint.

## Files Changed

### New files

| File | Purpose |
|---|---|
| `backend/src/common/constants/translation.constant.ts` | `TRANSLATION_ALLOWED_MIME_TYPES` constant |
| `backend/src/modules/file/dto/uploadTranslationFile.dto.ts` | DTO with `mangaId` and `chapterNumber` |

### Modified files

| File | Purpose |
|---|---|
| `backend/src/modules/file/file.service.ts` | Add `'application/zip': 'cbz'` to `EXT_MAP` |
| `backend/src/modules/file/file.controller.ts` | Add `POST /files/upload/translation` endpoint |
| `backend/src/modules/file/file.controller.spec.ts` | Test new endpoint |

## Design

### 1. Constants — `translation.constant.ts`

```ts
export const TRANSLATION_ALLOWED_MIME_TYPES = ['application/zip'] as const;
```

CBZ files are ZIP archives. NestJS's `FileTypeValidator` (via `file-type`) detects them as `application/zip` by magic bytes.

### 2. DTO — `UploadTranslationFileDto`

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

`@Type(() => Number)` is required because multer serializes form fields as strings; the global `ValidationPipe` with `transform: true` applies the type decorator.

### 3. FileService — `EXT_MAP`

Add to `EXT_MAP` in `file.service.ts`:

```ts
'application/zip': 'cbz',
```

This maps `application/zip` → `.cbz` extension for the stored file key.

### 4. FileController — new endpoint

```ts
@Post('upload/translation')
@UseInterceptors(FileInterceptor('file'))
async uploadTranslation(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }),
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

- 100MB file size limit
- Accepts only `application/zip` (CBZ) files
- Constructs Minio prefix: `/manga/{mangaId}/chapter/{chapterNumber}/translations/`
- Returns `{ key, url }` on success

### 5. Error handling

- Missing/invalid `mangaId` or `chapterNumber` → 400 (ValidationPipe)
- File > 100MB → 400 (MaxFileSizeValidator)
- Non-CBZ file → 400 (FileTypeValidator)
- Minio upload failure → 500 (InternalServerErrorException from `fileService.upload`)

### 6. Testing — `file.controller.spec.ts`

```ts
describe('POST /files/upload/translation', () => {
  it('should upload translation file and return key and url', async () => {
    const mockResult = {
      key: 'manga/1/chapter/3/translations/uuid.cbz',
      url: 'http://localhost:9000/manga-pages/manga/1/chapter/3/translations/uuid.cbz',
    };
    mockFileService.upload.mockResolvedValue(mockResult);

    const file = {
      originalname: 'chapter.cbz',
      buffer: Buffer.from('test'),
      mimetype: 'application/zip',
    } as Express.Multer.File;

    const result = await controller.uploadTranslation(file, {
      mangaId: 1,
      chapterNumber: 3,
    });
    expect(result).toEqual(mockResult);
    expect(mockFileService.upload).toHaveBeenCalledWith(
      '/manga/1/chapter/3/translations',
      file.buffer,
      file.mimetype,
    );
  });
});
```

`file.service.spec.ts` already tests `upload()` generically; the extension mapping for `application/zip` is implicitly covered by the controller test. Optionally add a dedicated test in `file.service.spec.ts`:

```ts
it('should map application/zip to .cbz extension', async () => {
  mockMinioClient.putObject.mockResolvedValue({ etag: '"abc"', versionId: null });
  const result = await service.upload('prefix', Buffer.from('data'), 'application/zip');
  expect(result.key).toMatch(/\.cbz$/);
});
```

## Acceptance Criteria

- [ ] `POST /files/upload/translation` accepts multipart form: `file` (CBZ), `mangaId` (number), `chapterNumber` (number)
- [ ] Returns 400 if `mangaId` or `chapterNumber` is missing or not a number
- [ ] Returns 400 if file > 100MB
- [ ] Returns 400 if file is not `application/zip`
- [ ] Stores file at `/manga/{mangaId}/chapter/{chapterNumber}/translations/{uuid}.cbz`
- [ ] Returns `{ key, url }` on success
- [ ] `cd backend && npm test` passes
