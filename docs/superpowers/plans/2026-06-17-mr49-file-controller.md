# MR49: File Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `FileController` with `POST /files/upload`, `GET /files/:key`, `DELETE /files/:key` REST endpoints that delegate to `FileService`.

**Architecture:** A single NestJS `@Controller('files')` class. Uses `@UseInterceptors(FileInterceptor('file'))` for multipart handling, `ParseFilePipe` with `MaxFileSizeValidator` for size enforcement, and inline checks for MIME type and prefix validation. All business logic delegated to existing `FileService`.

**Tech Stack:** NestJS, `@nestjs/platform-express` (FileInterceptor), `@nestjs/common` pipes, Jest

**Skills per task:**
- **Task 1** (test file): `test-driven-development` + `nestjs-testing`
- **Task 2** (implementation): `nestjs-best-practices`
- **Task 3** (module registration): `nestjs-best-practices`
- **Task 4** (verification): `verification-before-completion`

---

### Task 1: Write controller tests (TDD)

**Relevant skills:** `test-driven-development`, `nestjs-testing`

**Files:**
- Create: `backend/src/modules/file/file.controller.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/modules/file/file.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './services/file.service';
import { StreamableFile, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'node:stream';

describe('FileController', () => {
  let controller: FileController;
  let fileService: jest.Mocked<Pick<FileService, 'upload' | 'download' | 'delete'>>;

  beforeEach(async () => {
    fileService = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        { provide: FileService, useValue: fileService },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
  });

  describe('POST /files/upload', () => {
    const mockFile = {
      buffer: Buffer.from('test-image'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('accepts valid image upload and returns URL', async () => {
      fileService.upload.mockResolvedValue('http://localhost:9000/manga-pages/covers/uuid.jpg');

      const result = await controller.upload(mockFile, 'covers');

      expect(result).toEqual({ url: 'http://localhost:9000/manga-pages/covers/uuid.jpg', key: expect.any(String) });
      expect(fileService.upload).toHaveBeenCalledWith('covers', mockFile.buffer, 'image/jpeg');
    });

    it('returns url and key separately', async () => {
      const url = 'http://localhost:9000/manga-pages/covers/uuid.jpg';
      fileService.upload.mockResolvedValue(url);

      const result = await controller.upload(mockFile, 'covers');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toBe(url);
    });

    it('rejects non-image MIME type with BadRequestException', async () => {
      const badFile = { buffer: Buffer.from('data'), mimetype: 'application/pdf' } as Express.Multer.File;

      await expect(controller.upload(badFile, 'covers')).rejects.toThrow(BadRequestException);
      expect(fileService.upload).not.toHaveBeenCalled();
    });

    it('rejects empty prefix with BadRequestException', async () => {
      await expect(controller.upload(mockFile, '')).rejects.toThrow(BadRequestException);
      expect(fileService.upload).not.toHaveBeenCalled();
    });

    it('rejects undefined prefix with BadRequestException', async () => {
      await expect(controller.upload(mockFile, undefined as unknown as string)).rejects.toThrow(BadRequestException);
      expect(fileService.upload).not.toHaveBeenCalled();
    });

    it('propagates upload error as InternalServerErrorException', async () => {
      fileService.upload.mockRejectedValue(new InternalServerErrorException('File upload failed'));

      await expect(controller.upload(mockFile, 'covers')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /files/:key', () => {
    it('returns StreamableFile for existing key', async () => {
      const stream = new StreamableFile(Readable.from(['data']));
      fileService.download.mockResolvedValue(stream);

      const result = await controller.download('covers/test.jpg');

      expect(result).toBeInstanceOf(StreamableFile);
      expect(fileService.download).toHaveBeenCalledWith('covers/test.jpg');
    });

    it('throws NotFoundException for missing key', async () => {
      fileService.download.mockRejectedValue(new NotFoundException('File not found'));

      await expect(controller.download('covers/missing.jpg')).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /files/:key', () => {
    it('deletes file and returns void', async () => {
      fileService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('covers/test.jpg');

      expect(result).toBeUndefined();
      expect(fileService.delete).toHaveBeenCalledWith('covers/test.jpg');
    });

    it('propagates delete error as InternalServerErrorException', async () => {
      fileService.delete.mockRejectedValue(new InternalServerErrorException('File delete failed'));

      await expect(controller.delete('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/file.controller.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './file.controller'`

---

### Task 2: Implement FileController

**Relevant skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/file/file.controller.ts`

- [ ] **Step 1: Write minimal controller implementation**

```typescript
// backend/src/modules/file/file.controller.ts
import {
  Controller, Post, Get, Delete, Param, Body, UploadedFile,
  UseInterceptors, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './services/file.service';
import { StreamableFile } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('prefix') prefix: string,
  ): Promise<{ url: string; key: string }> {
    if (!file || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (JPEG, PNG, WebP) are allowed');
    }
    if (!prefix || !prefix.trim()) {
      throw new BadRequestException('Prefix is required');
    }
    const url = await this.fileService.upload(prefix.trim(), file.buffer, file.mimetype);
    return { url, key: url.split('/').slice(-2).join('/') };
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

- [ ] **Step 2: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/file/file.controller.spec.ts --no-coverage
```

Expected: PASS (10 tests)

- [ ] **Step 3: Verify build**

```bash
cd backend && npx nest build
```

Expected: No errors

---

### Task 3: Register FileController in FileModule

**Relevant skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/file/file.module.ts`

- [ ] **Step 1: Add FileController to controllers array**

Add import and register:

```typescript
import { FileController } from './file.controller';

// Inside @Module({
//   controllers: [FileController],
```

Note: `FileModule` is already registered in `app.module.ts` from MR47 — no change needed there.

- [ ] **Step 2: Run all tests**

```bash
cd backend && npm test
```

Expected: PASS — all existing tests (283+) + new controller tests (10)

- [ ] **Step 3: Verify build**

```bash
cd backend && npx nest build
```

Expected: No errors

---

### Task 4: Final verification

**Relevant skills:** `verification-before-completion`

- [ ] **Step 1: Run full test suite**

```bash
cd backend && npx jest --no-coverage
```

Expected: All tests pass

- [ ] **Step 2: Verify build**

```bash
cd backend && npx nest build
```

Expected: No errors

- [ ] **Step 3: Verify lint**

```bash
cd backend && npm run lint
```

Expected: No errors
