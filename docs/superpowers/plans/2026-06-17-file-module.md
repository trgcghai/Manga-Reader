# File Storage Module Implementation Plan (MR47–49)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS file storage module backed by Minio — MinioClient setup (MR47), FileService wrapper (MR48), and REST controller (MR49).

**Architecture:** Single `@Global()` FileModule with MinioClient as an internal custom provider. FileService is the only exported public API. Controller exposes POST `/files/upload` and DELETE `/files/:key*`. Clients load images directly from the Minio URL returned by upload.

**Tech Stack:** NestJS, Minio SDK (`minio` ^8.0.7 already installed), Jest with NestJS testing utilities.

---

## File Structure

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `backend/src/common/constants/chapter.constant.ts` | Add `ALLOWED_MIME_TYPES` |
| Create | `backend/src/common/utils/file-mime.util.ts` | Key → MIME type resolver |
| Test | `backend/src/common/utils/file-mime.util.spec.ts` | Tests for MIME resolver |
| Create | `backend/src/modules/file/file.module.ts` | Module def, MinioClient provider, bucket auto-creation |
| Test | `backend/src/modules/file/file.module.spec.ts` | Tests for module init |
| Create | `backend/src/modules/file/file.service.ts` | FileService (upload, download, delete, list) |
| Test | `backend/src/modules/file/file.service.spec.ts` | Tests for FileService |
| Create | `backend/src/modules/file/file.controller.ts` | POST /files/upload, DELETE /files/:key* |
| Test | `backend/src/modules/file/file.controller.spec.ts` | Tests for controller |
| Modify | `backend/src/app.module.ts` | Import FileModule |

---

### Task 1: Add ALLOWED_MIME_TYPES to chapter.constant.ts

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/common/constants/chapter.constant.ts`

- [ ] **Step 1: Add ALLOWED_MIME_TYPES constant**

```ts
// In backend/src/common/constants/chapter.constant.ts
// After the existing ImageExtension type and SUPPORTED_IMAGE_EXTENSIONS:

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
```

- [ ] **Step 2: Verify no tests break**

Run: `cd backend && npm test -- --testPathPattern=chapter.constant -v`

Expected: No tests found or all pass (this file has no dedicated tests).

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/constants/chapter.constant.ts
git commit -m "feat: add ALLOWED_MIME_TYPES constant"
```

---

### Task 2: Create file-mime.util.ts (global MIME utility)

**Related skills:** `javascript-typescript-jest`

**Files:**
- Create: `backend/src/common/utils/file-mime.util.ts`
- Create: `backend/src/common/utils/file-mime.util.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/common/utils/file-mime.util.spec.ts
import { getContentType } from './file-mime.util';

describe('file-mime.util', () => {
  it('should return image/jpeg for .jpg', () => {
    expect(getContentType('covers/abc.jpg')).toBe('image/jpeg');
  });

  it('should return image/jpeg for .jpeg', () => {
    expect(getContentType('covers/abc.jpeg')).toBe('image/jpeg');
  });

  it('should return image/png for .png', () => {
    expect(getContentType('pages/xyz.png')).toBe('image/png');
  });

  it('should return image/webp for .webp', () => {
    expect(getContentType('thumbnails/thumb.webp')).toBe('image/webp');
  });

  it('should return application/octet-stream for unknown extension', () => {
    expect(getContentType('file.bin')).toBe('application/octet-stream');
  });

  it('should handle path with multiple dots', () => {
    expect(getContentType('pages/a.b.c.png')).toBe('image/png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=file-mime.util -v`

Expected: FAIL — `Cannot find module './file-mime.util'`

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/common/utils/file-mime.util.ts
const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return ext && MIME_MAP[ext] ? MIME_MAP[ext] : 'application/octet-stream';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern=file-mime.util -v`

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/utils/file-mime.util.ts backend/src/common/utils/file-mime.util.spec.ts
git commit -m "feat: add file-mime.util with key-to-MIME resolver"
```

---

### Task 3: Create FileModule with MinioClient provider (MR47)

**Related skills:** `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Create: `backend/src/modules/file/file.module.ts`
- Create: `backend/src/modules/file/file.module.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/modules/file/file.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileModule, MINIO_CLIENT } from './file.module';
import * as Minio from 'minio';

describe('FileModule', () => {
  it('should be defined', () => {
    expect(new FileModule({} as Minio.Client, {} as ConfigService)).toBeDefined();
  });

  describe('MINIO_CLIENT provider', () => {
    it('should provide a Minio.Client instance', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            ignoreEnvVars: false,
          }),
          FileModule,
        ],
      }).compile();

      const minioClient = module.get<Minio.Client>(MINIO_CLIENT);
      expect(minioClient).toBeDefined();
      expect(minioClient).toBeInstanceOf(Minio.Client);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=file.module -v`

Expected: FAIL — `Cannot find module './file.module'`

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/modules/file/file.module.ts
import { Global, Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT')!;
        const url = new URL(endpoint);
        return new Minio.Client({
          endPoint: url.hostname,
          port: Number(url.port) || 9000,
          useSSL: url.protocol === 'https:',
          accessKey: configService.get<string>('MINIO_ACCESS_KEY')!,
          secretKey: configService.get<string>('MINIO_SECRET_KEY')!,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [],
})
export class FileModule implements OnModuleInit {
  private readonly logger = new Logger(FileModule.name);

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    const exists = await this.minioClient.bucketExists(bucket);
    if (exists) {
      this.logger.log(`Minio bucket "${bucket}" found`);
    } else {
      await this.minioClient.makeBucket(bucket, 'us-east-1');
      this.logger.log(`Minio bucket "${bucket}" created`);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Note: The integration test will need `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` env vars. If env vars aren't set, the test may fail. Update the test to be more unit-like:

```ts
// backend/src/modules/file/file.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileModule, MINIO_CLIENT } from './file.module';
import * as Minio from 'minio';

describe('FileModule', () => {
  it('should provide MINIO_CLIENT as a Minio.Client instance', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: false,
        }),
        FileModule,
      ],
    }).compile();

    const minioClient = module.get(MINIO_CLIENT);
    expect(minioClient).toBeDefined();
    expect(minioClient).toBeInstanceOf(Minio.Client);
  });
});
```

Run again: `cd backend && npm test -- --testPathPattern=file.module -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/file.module.ts backend/src/modules/file/file.module.spec.ts
git commit -m "feat(MR47): add Minio client module with bucket auto-creation"
```

---

### Task 4: Create FileService (MR48)

**Related skills:** `nestjs-best-practices`, `javascript-typescript-jest`, `nestjs-testing`

**Files:**
- Create: `backend/src/modules/file/file.service.ts`
- Create: `backend/src/modules/file/file.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/modules/file/file.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { MINIO_CLIENT } from './file.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'node:stream';

describe('FileService', () => {
  let service: FileService;
  let minioClient: jest.Mocked<Minio.Client>;
  let configService: ConfigService;

  const mockMinioClient = {
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    listObjects: jest.fn(),
  } as unknown as jest.Mocked<Minio.Client>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, ignoreEnvVars: false })],
      providers: [
        FileService,
        { provide: MINIO_CLIENT, useValue: mockMinioClient },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload a buffer and return key and Minio URL', async () => {
      mockMinioClient.putObject.mockResolvedValue(undefined);
      const buffer = Buffer.from('test-image-data');
      const result = await service.upload('covers', buffer, 'image/jpeg');
      expect(result.key).toMatch(/^covers\/.+\.jpg$/);
      expect(result.url).toMatch(/^http:\/\/localhost:9000\/manga-pages\/covers\/.+\.jpg$/);
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Connection refused'));
      await expect(service.upload('covers', Buffer.from('test'), 'image/png')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('download', () => {
    it('should return a StreamableFile', async () => {
      const mockStream = Readable.from(['test-data']);
      mockMinioClient.getObject.mockResolvedValue(mockStream);
      const result = await service.download('covers/test.jpg');
      expect(result).toBeDefined();
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('manga-pages', 'covers/test.jpg');
    });

    it('should throw NotFoundException when file does not exist', async () => {
      const error = new Error('Not found');
      (error as any).code = 'NoSuchKey';
      mockMinioClient.getObject.mockRejectedValue(error);
      await expect(service.download('covers/missing.jpg')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should call removeObject with correct key', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);
      await service.delete('covers/test.jpg');
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('manga-pages', 'covers/test.jpg');
    });

    it('should throw InternalServerErrorException on failure', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Access denied'));
      await expect(service.delete('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('list', () => {
    it('should return list of file keys', async () => {
      const mockStream = (async function* () {
        yield { name: 'covers/a.jpg' };
        yield { name: 'covers/b.jpg' };
      })();
      mockMinioClient.listObjects.mockReturnValue(mockStream as any);
      const result = await service.list('covers');
      expect(result).toEqual(['covers/a.jpg', 'covers/b.jpg']);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=file.service -v`

Expected: FAIL — `Cannot find module './file.service'`

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/modules/file/file.service.ts
import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CLIENT } from './file.module';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { getContentType } from '../common/utils/file-mime.util';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.get<string>('MINIO_BUCKET')!;
    this.endpoint = configService.get<string>('MINIO_ENDPOINT', '').replace(/\/+$/, '');
  }

  async upload(prefix: string, buffer: Buffer, mimetype: string): Promise<string> {
    const ext = EXT_MAP[mimetype] || 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(this.bucket, key, buffer, {
        'Content-Type': mimetype,
      });
      return { key, url: `${this.endpoint}/${this.bucket}/${key}` };
    } catch (error) {
      this.logger.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async download(key: string): Promise<StreamableFile> {
    try {
      const stream = await this.minioClient.getObject(this.bucket, key);
      const contentType = getContentType(key);
      return new StreamableFile(stream as Readable, { type: contentType });
    } catch (error: any) {
      if (error?.code === 'NoSuchKey' || error?.code === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File download failed');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File delete failed');
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const stream = this.minioClient.listObjects(this.bucket, prefix || '', true);
      const keys: string[] = [];
      for await (const obj of stream) {
        keys.push(obj.name);
      }
      return keys;
    } catch (error) {
      this.logger.error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File list failed');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern=file.service -v`

Expected: All tests PASS

- [ ] **Step 5: Register FileService in FileModule**

Update `file.module.ts` — add `FileService` to providers:

```ts
// In file.module.ts providers array, after MINIO_CLIENT:
providers: [
  FileService,
  { provide: MINIO_CLIENT, useFactory: ..., inject: ... },
],
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/file/file.service.ts backend/src/modules/file/file.service.spec.ts backend/src/modules/file/file.module.ts
git commit -m "feat(MR48): add FileService with upload/download/delete/list"
```

---

### Task 5: Create FileController (MR49)

**Related skills:** `nestjs-best-practices`, `javascript-typescript-jest`, `nestjs-testing`

**Files:**
- Create: `backend/src/modules/file/file.controller.ts`
- Create: `backend/src/modules/file/file.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/modules/file/file.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { BadRequestException } from '@nestjs/common';

describe('FileController', () => {
  let controller: FileController;
  let fileService: jest.Mocked<FileService>;

  const mockFileService = {
    upload: jest.fn(),
    delete: jest.fn(),
    download: jest.fn(),
    list: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    controller = module.get<FileController>(FileController);
    fileService = module.get(FileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /files/upload', () => {
    it('should upload file and return key and url', async () => {
      const mockResult = { key: 'uploads/uuid.jpg', url: 'http://localhost:9000/manga-pages/uploads/uuid.jpg' };
      mockFileService.upload.mockResolvedValue(mockResult);

      const file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await controller.upload(file);
      expect(result).toEqual(mockResult);
      expect(mockFileService.upload).toHaveBeenCalledWith('uploads', file.buffer, file.mimetype);
    });
  });

  describe('DELETE /files/:key', () => {
    it('should delete file by key', async () => {
      mockFileService.delete.mockResolvedValue(undefined);
      await controller.delete('covers/test.jpg');
      expect(mockFileService.delete).toHaveBeenCalledWith('covers/test.jpg');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=file.controller -v`

Expected: FAIL — `Cannot find module './file.controller'`

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/modules/file/file.controller.ts
import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ALLOWED_MIME_TYPES } from '../common/constants/chapter.constant';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: new RegExp(`^(${ALLOWED_MIME_TYPES.join('|')})$`) }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const { key, url } = await this.fileService.upload('uploads', file.buffer, file.mimetype);
    return { key, url };
  }

  @Delete(':key*')
  async delete(@Param('key') key: string) {
    await this.fileService.delete(key);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern=file.controller -v`

Expected: All tests PASS

- [ ] **Step 5: Register FileController in FileModule**

Update `file.module.ts` — add `FileController` to controllers:

```ts
// In file.module.ts
import { FileController } from './file.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [FileService, ... ],
  exports: [],
})
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/file/file.controller.ts backend/src/modules/file/file.controller.spec.ts backend/src/modules/file/file.module.ts
git commit -m "feat(MR49): add FileController with POST upload and DELETE endpoints"
```

---

### Task 6: Register FileModule in AppModule

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Add FileModule import**

In `backend/src/app.module.ts`:
- Add import: `import { FileModule } from './modules/file/file.module';`
- Add `FileModule` to the `imports` array (anywhere in the array, e.g., before `MangaModule`)

- [ ] **Step 2: Run all tests to verify nothing breaks**

Run: `cd backend && npm test`

Expected: All existing tests still PASS (no regressions)

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat: register FileModule in AppModule"
```

---

### Task 7: Run lint + final verification

**Related skills:** `verification-before-completion`

- [ ] **Step 1: Run lint**

```bash
cd backend && npm run lint
```

Expected: No errors or warnings

- [ ] **Step 2: Run type check**

```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Run full test suite**

```bash
cd backend && npm test
```

Expected: All tests PASS
