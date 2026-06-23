# MR49: File Controller — Design Doc

## Overview

REST controller (`/files`) for uploading and serving files stored in Minio. Frontend/admin use these endpoints to upload manga covers, chapter pages, and other assets.

## Prerequisites (already done)

- `FileModule` registered as `@Global()` in `app.module.ts`
- `FileService` with `upload`, `download`, `delete`, `list` methods
- `FileMimeUtil` for MIME → extension resolution
- `MINIO_CLIENT` provider

## Endpoints

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | `/files/upload` | multipart: `file` (File) + `prefix` (string) | `{ url: string, key: string }` | Store file, return full URL |
| GET | `/files/:key` | param `key` | StreamableFile + correct Content-Type | Stream from Minio |
| DELETE | `/files/:key` | param `key` | 204 No Content | Remove from Minio |

## Validation

- **File type**: Accept only `image/jpeg`, `image/png`, `image/webp` — inline check after `FileInterceptor`, reject with 400
- **File size**: Max 10 MB — NestJS `MaxFileSizeValidator` via `ParseFilePipe`, reject with 413
- **Prefix**: Required form field — retrieve from `req.body.prefix`, reject with 400 if blank

## Implementation

### Controller class

```
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Body('prefix') prefix: string,
  ): Promise<{ url: string; key: string }> {
    // validate type inline
    // validate prefix
    // fileService.upload(prefix, buffer, mimetype)
  }

  @Get(':key')
  async download(@Param('key') key: string): Promise<StreamableFile> {
    return this.fileService.download(key);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('key') key: string): Promise<void> {
    return this.fileService.delete(key);
  }
}
```

## Test Strategy

Whitebox — mock `FileService` entirely.

| Test | Expect |
|---|---|
| POST upload success | returns `{ url, key }`, calls service with correct args |
| POST upload invalid mime type | throws 400 |
| POST upload file too large | throws 413 (NestJS ParseFilePipe) |
| POST upload missing prefix | throws 400 |
| GET download found | returns `StreamableFile` |
| GET download missing | throws 404 |
| DELETE delete success | returns 204 |
| DELETE delete error | throws 500 |

## File changes

- `backend/src/modules/file/file.controller.ts` — new
- `backend/src/modules/file/file.controller.spec.ts` — new
- `backend/src/modules/file/file.module.ts` — add `FileController` to `controllers`
