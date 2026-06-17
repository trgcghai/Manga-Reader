# MR48: File Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `FileService` that wraps Minio operations (upload, download, delete, list) for manga image storage.

**Architecture:** A single injectable service class injected with `MINIO_CLIENT` provider from MR47. Each method wraps a corresponding Minio.Client call with error transformation. MIME type resolution extracted as a pure utility function for testability.

**Tech Stack:** NestJS, `minio` npm package, `crypto.randomUUID()` (Node 22), Jest

---

### Task 1: MIME type resolver utility

**Files:**
- Create: `backend/src/modules/file/services/file-mime.util.ts`
- Test: `backend/src/modules/file/services/file-mime.util.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/file/services/file-mime.util.spec.ts
import { getContentType } from './file-mime.util';

describe('getContentType', () => {
  it('returns image/jpeg for .jpg', () => {
    expect(getContentType('cover.jpg')).toBe('image/jpeg');
  });

  it('returns image/jpeg for .jpeg', () => {
    expect(getContentType('cover.jpeg')).toBe('image/jpeg');
  });

  it('returns image/png for .png', () => {
    expect(getContentType('cover.png')).toBe('image/png');
  });

  it('returns image/webp for .webp', () => {
    expect(getContentType('cover.webp')).toBe('image/webp');
  });

  it('returns application/octet-stream for unknown extension', () => {
    expect(getContentType('cover.bin')).toBe('application/octet-stream');
  });

  it('returns application/octet-stream for no extension', () => {
    expect(getContentType('cover')).toBe('application/octet-stream');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/services/file-mime.util.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './file-mime.util'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/modules/file/services/file-mime.util.ts
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

```bash
cd backend && npx jest src/modules/file/services/file-mime.util.spec.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/services/file-mime.util.ts backend/src/modules/file/services/file-mime.util.spec.ts
git commit -m "feat: add MIME type resolver utility"
```

---

### Task 2: FileService — upload method

**Files:**
- Create: `backend/src/modules/file/services/file.service.ts`
- Test: `backend/src/modules/file/services/file.service.spec.ts`

- [ ] **Step 1: Write the failing tests for upload**

```typescript
// backend/src/modules/file/services/file.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { MINIO_CLIENT } from '../file.module';
import { InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';

describe('FileService', () => {
  let service: FileService;
  let mockMinioClient: jest.Mocked<Pick<Minio.Client, 'putObject' | 'getObject' | 'removeObject' | 'listObjects'>>;

  beforeEach(async () => {
    mockMinioClient = {
      putObject: jest.fn().mockResolvedValue(undefined),
      getObject: jest.fn(),
      removeObject: jest.fn().mockResolvedValue(undefined),
      listObjects: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: MINIO_CLIENT, useValue: mockMinioClient },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('upload', () => {
    const prefix = 'covers';
    const buffer = Buffer.from('test-image-data');
    const mimetype = 'image/jpeg';

    it('stores file and returns full URL', async () => {
      const url = await service.upload(prefix, buffer, mimetype);

      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^covers\/.+\.jpg$/),
        buffer,
        expect.objectContaining({ 'Content-Type': mimetype }),
      );
      expect(url).toMatch(/^http:\/\/.+\/manga-pages\/covers\/.+\.jpg$/);
    });

    it('propagates Minio error as InternalServerErrorException', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('connection lost'));

      await expect(service.upload(prefix, buffer, mimetype)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './file.service'`

- [ ] **Step 3: Write minimal upload implementation**

```typescript
// backend/src/modules/file/services/file.service.ts
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CLIENT } from '../file.module';
import { randomUUID } from 'node:crypto';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class FileService {
  private readonly bucket: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.get<string>('MINIO_BUCKET')!;
  }

  async upload(prefix: string, buffer: Buffer, mimetype: string): Promise<string> {
    const ext = EXT_MAP[mimetype] || 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(this.bucket, key, buffer, {
        'Content-Type': mimetype,
      });
      return `${process.env['MINIO_ENDPOINT']}/${this.bucket}/${key}`;
    } catch (error) {
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/services/file.service.ts backend/src/modules/file/services/file.service.spec.ts
git commit -m "feat: add FileService upload method"
```

---

### Task 3: FileService — download method

- [ ] **Step 1: Add download tests to file.service.spec.ts**

Add inside the `describe('FileService')` block, after the `describe('upload')`:

```typescript
import { StreamableFile, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';

// inside describe('FileService'), after the upload describe block:
describe('download', () => {
  it('returns StreamableFile for existing key', async () => {
    const stream = Readable.from(['test-data']);
    mockMinioClient.getObject.mockResolvedValue(stream);

    const result = await service.download('covers/test.jpg');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(mockMinioClient.getObject).toHaveBeenCalledWith(expect.any(String), 'covers/test.jpg');
  });

  it('throws NotFoundException for NoSuchKey error', async () => {
    const err = new Error('Not found');
    (err as any).code = 'NoSuchKey';
    mockMinioClient.getObject.mockRejectedValue(err);

    await expect(service.download('covers/missing.jpg')).rejects.toThrow(NotFoundException);
  });

  it('throws InternalServerErrorException for other Minio errors', async () => {
    mockMinioClient.getObject.mockRejectedValue(new Error('timeout'));

    await expect(service.download('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: FAIL — `service.download is not a function`

- [ ] **Step 3: Implement download method**

Add to `FileService` class:

```typescript
import { StreamableFile, NotFoundException } from '@nestjs/common';
import { getContentType } from './file-mime.util';

// Inside FileService class:
async download(key: string): Promise<StreamableFile> {
  try {
    const stream = await this.minioClient.getObject(this.bucket, key);
    const contentType = getContentType(key);
    return new StreamableFile(stream as Readable, { type: contentType });
  } catch (error: any) {
    if (error?.code === 'NoSuchKey' || error?.code === 'NotFound') {
      throw new NotFoundException('File not found');
    }
    throw new InternalServerErrorException('File download failed');
  }
}
```

Also add the missing import at the top of `file.service.ts`:

```typescript
import { Readable } from 'node:stream';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: PASS (5 tests total)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/services/file.service.ts backend/src/modules/file/services/file.service.spec.ts
git commit -m "feat: add FileService download method"
```

---

### Task 4: FileService — delete method

- [ ] **Step 1: Add delete tests to file.service.spec.ts**

Add after the `describe('download')` block:

```typescript
describe('delete', () => {
  it('removes object from Minio', async () => {
    await service.delete('covers/test.jpg');

    expect(mockMinioClient.removeObject).toHaveBeenCalledWith(expect.any(String), 'covers/test.jpg');
  });

  it('throws InternalServerErrorException on Minio error', async () => {
    mockMinioClient.removeObject.mockRejectedValue(new Error('remove failed'));

    await expect(service.delete('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: FAIL — `service.delete is not a function`

- [ ] **Step 3: Implement delete method**

Add to `FileService` class:

```typescript
async delete(key: string): Promise<void> {
  try {
    await this.minioClient.removeObject(this.bucket, key);
  } catch (error) {
    throw new InternalServerErrorException('File delete failed');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: PASS (7 tests total)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/services/file.service.ts backend/src/modules/file/services/file.service.spec.ts
git commit -m "feat: add FileService delete method"
```

---

### Task 5: FileService — list method

- [ ] **Step 1: Add list tests to file.service.spec.ts**

Add after the `describe('delete')` block:

```typescript
import { from } from 'rxjs';

describe('list', () => {
  it('returns all keys with no prefix', async () => {
    const mockStream = Readable.from([{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }]);
    mockMinioClient.listObjects.mockReturnValue(mockStream);

    const result = await service.list();

    expect(result).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(mockMinioClient.listObjects).toHaveBeenCalledWith(expect.any(String), '', true);
  });

  it('returns filtered keys with prefix', async () => {
    const mockStream = Readable.from([{ name: 'covers/x.jpg' }, { name: 'covers/y.jpg' }]);
    mockMinioClient.listObjects.mockReturnValue(mockStream);

    const result = await service.list('covers');

    expect(result).toEqual(['covers/x.jpg', 'covers/y.jpg']);
    expect(mockMinioClient.listObjects).toHaveBeenCalledWith(expect.any(String), 'covers', true);
  });

  it('throws InternalServerErrorException on stream error', async () => {
    const mockStream = Readable.from([]);
    jest.spyOn(mockStream, 'pipe').mockImplementation(() => {
      throw new Error('stream failed');
    });
    mockMinioClient.listObjects.mockReturnValue(mockStream);

    await expect(service.list()).rejects.toThrow(InternalServerErrorException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: FAIL — `service.list is not a function`

- [ ] **Step 3: Implement list method**

Add to `FileService` class:

```typescript
async list(prefix?: string): Promise<string[]> {
  try {
    const stream = this.minioClient.listObjects(this.bucket, prefix || '', true);
    const keys: string[] = [];
    for await (const obj of stream) {
      keys.push(obj.name);
    }
    return keys;
  } catch (error) {
    throw new InternalServerErrorException('File list failed');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/file/services/file.service.spec.ts --no-coverage
```

Expected: PASS (10 tests total)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/services/file.service.ts backend/src/modules/file/services/file.service.spec.ts
git commit -m "feat: add FileService list method"
```

---

### Task 6: Register FileService in FileModule

**Files:**
- Modify: `backend/src/modules/file/file.module.ts`

- [ ] **Step 1: Add FileService to providers**

Add `FileService` to the `providers` array in the same file where `MINIO_CLIENT` is defined:

```typescript
import { FileService } from './services/file.service';

// Inside @Module({ providers: [
FileService,
// after the MINIO_CLIENT provider
```

- [ ] **Step 2: Run all tests to verify nothing broke**

```bash
cd backend && npm test
```

Expected: PASS — all existing tests + new FileService tests

- [ ] **Step 3: Verify build**

```bash
cd backend && npx nest build
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/file/file.module.ts
git commit -m "feat: register FileService in FileModule"
```
