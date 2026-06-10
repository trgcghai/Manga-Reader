# MR07 Filesystem Image Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET /chapter/scan?path=...` so the backend returns direct child image files from a client-supplied local folder path.

**Architecture:** Add a focused `ChapterScannerService` inside `backend/src/modules/chapter/` for filesystem scanning. Keep `ChapterController` thin by reading the `path` query parameter and delegating to the scanner service. Use Jest fixture folders to drive the implementation before writing production code.

**Tech Stack:** NestJS 11, TypeScript, Jest, Node `fs/promises`, Node `path`.

---

## File Structure

- Create: `backend/src/modules/chapter/chapter-scanner.service.ts`
  - Owns all filesystem behavior for MR07.
  - Exports `ImageExtension`, `ScannedImage`, `ScanImagesResult`, and `ChapterScannerService`.
- Create: `backend/src/modules/chapter/chapter-scanner.service.spec.ts`
  - Fixture-based service tests written before implementation.
- Create fixture files under `backend/src/modules/chapter/__fixtures__/scan-images/`
  - Provides stable local files and folders for Jest tests.
- Modify: `backend/src/modules/chapter/chapter.controller.ts`
  - Adds `GET /chapter/scan?path=...`.
  - Injects `ChapterScannerService`.
- Modify: `backend/src/modules/chapter/chapter.controller.spec.ts`
  - Updates controller tests for the new dependency and scan endpoint.
- Modify: `backend/src/modules/chapter/chapter.module.ts`
  - Registers `ChapterScannerService`.

---

### Task 1: Add Scanner Fixture And Failing Service Tests

**Files:**
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/001.jpg`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/010.png`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/002.webp`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/COVER.JPEG`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/animated.GIF`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/notes.txt`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/archive.cbz`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/mixed/nested-folder/ignored.jpg`
- Create: `backend/src/modules/chapter/__fixtures__/scan-images/empty/.gitkeep`
- Create: `backend/src/modules/chapter/chapter-scanner.service.spec.ts`
- Create: `backend/src/modules/chapter/chapter-scanner.service.ts`

- [ ] **Step 1: Create fixture directories and files**

Use PowerShell from repo root:

```powershell
New-Item -ItemType Directory -Force 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/nested-folder'
New-Item -ItemType Directory -Force 'backend/src/modules/chapter/__fixtures__/scan-images/empty'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/001.jpg' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/010.png' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/002.webp' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/COVER.JPEG' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/animated.GIF' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/notes.txt' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/archive.cbz' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/mixed/nested-folder/ignored.jpg' 'fixture'
Set-Content -NoNewline 'backend/src/modules/chapter/__fixtures__/scan-images/empty/.gitkeep' ''
```

- [ ] **Step 2: Add the failing service test**

Create `backend/src/modules/chapter/chapter-scanner.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { join, resolve } from 'path';
import { ChapterScannerService } from './chapter-scanner.service';

describe('ChapterScannerService', () => {
  let service: ChapterScannerService;

  const fixturesRoot = join(__dirname, '__fixtures__', 'scan-images');

  beforeEach(() => {
    service = new ChapterScannerService();
  });

  it('returns direct child image files in natural filename order', async () => {
    const targetPath = join(fixturesRoot, 'mixed');

    const result = await service.scanImages(targetPath);

    expect(result).toEqual({
      path: resolve(targetPath),
      images: [
        {
          name: '001.jpg',
          path: resolve(targetPath, '001.jpg'),
          extension: 'jpg',
        },
        {
          name: '002.webp',
          path: resolve(targetPath, '002.webp'),
          extension: 'webp',
        },
        {
          name: '010.png',
          path: resolve(targetPath, '010.png'),
          extension: 'png',
        },
        {
          name: 'animated.GIF',
          path: resolve(targetPath, 'animated.GIF'),
          extension: 'gif',
        },
        {
          name: 'COVER.JPEG',
          path: resolve(targetPath, 'COVER.JPEG'),
          extension: 'jpeg',
        },
      ],
    });
  });

  it('ignores directories, nested images, and non-image files', async () => {
    const targetPath = join(fixturesRoot, 'mixed');

    const result = await service.scanImages(targetPath);

    expect(result.images.map((image) => image.name)).not.toContain('notes.txt');
    expect(result.images.map((image) => image.name)).not.toContain('archive.cbz');
    expect(result.images.map((image) => image.name)).not.toContain('nested-folder');
    expect(result.images.map((image) => image.name)).not.toContain('ignored.jpg');
  });

  it('returns an empty list for a readable folder with no images', async () => {
    const targetPath = join(fixturesRoot, 'empty');

    await expect(service.scanImages(targetPath)).resolves.toEqual({
      path: resolve(targetPath),
      images: [],
    });
  });

  it('throws BadRequestException when path is missing', async () => {
    await expect(service.scanImages('')).rejects.toThrow(BadRequestException);
    await expect(service.scanImages('   ')).rejects.toThrow(
      'Path query parameter is required',
    );
  });

  it('throws BadRequestException when path does not exist', async () => {
    await expect(
      service.scanImages(join(fixturesRoot, 'missing')),
    ).rejects.toThrow('Path does not exist or cannot be read');
  });

  it('throws BadRequestException when path is not a directory', async () => {
    await expect(
      service.scanImages(join(fixturesRoot, 'mixed', '001.jpg')),
    ).rejects.toThrow('Path must be a readable directory');
  });
});
```

- [ ] **Step 3: Add a temporary empty service file so TypeScript can resolve the import**

Create `backend/src/modules/chapter/chapter-scanner.service.ts`:

```ts
export class ChapterScannerService {}
```

- [ ] **Step 4: Run service test and verify it fails**

Run:

```powershell
cd backend
npm run test -- chapter-scanner.service.spec.ts
```

Expected: FAIL because `scanImages` does not exist on `ChapterScannerService`.

- [ ] **Step 5: Commit the failing test**

```powershell
git add backend/src/modules/chapter/__fixtures__/scan-images backend/src/modules/chapter/chapter-scanner.service.spec.ts backend/src/modules/chapter/chapter-scanner.service.ts
git commit -m "test: add MR07 scanner service expectations"
```

---

### Task 2: Implement Scanner Service To Pass Service Tests

**Files:**
- Modify: `backend/src/modules/chapter/chapter-scanner.service.ts`
- Test: `backend/src/modules/chapter/chapter-scanner.service.spec.ts`

- [ ] **Step 1: Replace the temporary service with the implementation**

Replace `backend/src/modules/chapter/chapter-scanner.service.ts` with:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Dirent } from 'fs';
import { readdir, stat } from 'fs/promises';
import { extname, resolve } from 'path';

export type ImageExtension = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';

export interface ScannedImage {
  name: string;
  path: string;
  extension: ImageExtension;
}

export interface ScanImagesResult {
  path: string;
  images: ScannedImage[];
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set<ImageExtension>([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
]);

const naturalFilenameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

@Injectable()
export class ChapterScannerService {
  async scanImages(inputPath: string): Promise<ScanImagesResult> {
    if (!inputPath?.trim()) {
      throw new BadRequestException('Path query parameter is required');
    }

    const directoryPath = resolve(inputPath);
    await this.ensureReadableDirectory(directoryPath);
    const entries = await this.readDirectoryEntries(directoryPath);

    const images = entries
      .filter((entry) => entry.isFile())
      .map((entry) => this.toScannedImage(directoryPath, entry))
      .filter((image): image is ScannedImage => image !== null)
      .sort((left, right) =>
        naturalFilenameCollator.compare(left.name, right.name),
      );

    return {
      path: directoryPath,
      images,
    };
  }

  private async ensureReadableDirectory(directoryPath: string): Promise<void> {
    try {
      const pathStats = await stat(directoryPath);

      if (!pathStats.isDirectory()) {
        throw new BadRequestException('Path must be a readable directory');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Path does not exist or cannot be read');
    }
  }

  private async readDirectoryEntries(directoryPath: string): Promise<Dirent[]> {
    try {
      return await readdir(directoryPath, { withFileTypes: true });
    } catch {
      throw new BadRequestException('Path does not exist or cannot be read');
    }
  }

  private toScannedImage(
    directoryPath: string,
    entry: Dirent,
  ): ScannedImage | null {
    const extension = extname(entry.name).slice(1).toLowerCase();

    if (!this.isSupportedImageExtension(extension)) {
      return null;
    }

    return {
      name: entry.name,
      path: resolve(directoryPath, entry.name),
      extension,
    };
  }

  private isSupportedImageExtension(
    extension: string,
  ): extension is ImageExtension {
    return SUPPORTED_IMAGE_EXTENSIONS.has(extension as ImageExtension);
  }
}
```

- [ ] **Step 2: Run service tests and verify they pass**

Run:

```powershell
cd backend
npm run test -- chapter-scanner.service.spec.ts
```

Expected: PASS for all tests in `chapter-scanner.service.spec.ts`.

- [ ] **Step 3: Commit scanner implementation**

```powershell
git add backend/src/modules/chapter/chapter-scanner.service.ts
git commit -m "feat: implement chapter image scanner service"
```

---

### Task 3: Add Controller Tests For GET /chapter/scan

**Files:**
- Modify: `backend/src/modules/chapter/chapter.controller.spec.ts`

- [ ] **Step 1: Replace the controller spec with endpoint-focused tests**

Replace `backend/src/modules/chapter/chapter.controller.spec.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChapterController } from './chapter.controller';
import { ChapterScannerService } from './chapter-scanner.service';
import { ChapterService } from './chapter.service';

describe('ChapterController', () => {
  let controller: ChapterController;
  let scannerService: jest.Mocked<Pick<ChapterScannerService, 'scanImages'>>;

  beforeEach(async () => {
    scannerService = {
      scanImages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChapterController],
      providers: [
        ChapterService,
        {
          provide: ChapterScannerService,
          useValue: scannerService,
        },
      ],
    }).compile();

    controller = module.get<ChapterController>(ChapterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('scans images for the query path', async () => {
    const scanResult = {
      path: 'D:/Manga/Chapter 001',
      images: [
        {
          name: '001.jpg',
          path: 'D:/Manga/Chapter 001/001.jpg',
          extension: 'jpg' as const,
        },
      ],
    };
    scannerService.scanImages.mockResolvedValue(scanResult);

    await expect(controller.scan('D:/Manga/Chapter 001')).resolves.toBe(
      scanResult,
    );
    expect(scannerService.scanImages).toHaveBeenCalledWith(
      'D:/Manga/Chapter 001',
    );
  });

  it('throws BadRequestException when query path is missing', async () => {
    scannerService.scanImages.mockRejectedValue(
      new BadRequestException('Path query parameter is required'),
    );

    await expect(controller.scan('')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run controller test and verify it fails**

Run:

```powershell
cd backend
npm run test -- chapter.controller.spec.ts
```

Expected: FAIL because `ChapterController` does not inject `ChapterScannerService` and does not have `scan()`.

- [ ] **Step 3: Commit failing controller tests**

```powershell
git add backend/src/modules/chapter/chapter.controller.spec.ts
git commit -m "test: add MR07 chapter scan controller expectations"
```

---

### Task 4: Implement Controller Endpoint And Module Provider

**Files:**
- Modify: `backend/src/modules/chapter/chapter.controller.ts`
- Modify: `backend/src/modules/chapter/chapter.module.ts`
- Test: `backend/src/modules/chapter/chapter.controller.spec.ts`
- Test: `backend/src/modules/chapter/chapter-scanner.service.spec.ts`

- [ ] **Step 1: Update the controller constructor and imports**

In `backend/src/modules/chapter/chapter.controller.ts`, replace the imports with:

```ts
import { Controller, Get, Post, Patch, Param, Delete, Query } from '@nestjs/common';
import { ChapterScannerService } from './chapter-scanner.service';
import { ChapterService } from './chapter.service';
```

Replace the constructor with:

```ts
  constructor(
    private readonly chapterService: ChapterService,
    private readonly chapterScannerService: ChapterScannerService,
  ) {}
```

- [ ] **Step 2: Add the scan endpoint before `@Get(':id')`**

Add this method in `ChapterController` after `findAll()` and before `findOne()`:

```ts
  @Get('scan')
  scan(@Query('path') path: string) {
    return this.chapterScannerService.scanImages(path);
  }
```

- [ ] **Step 3: Register the scanner provider in the module**

Replace `backend/src/modules/chapter/chapter.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { ChapterController } from './chapter.controller';
import { ChapterScannerService } from './chapter-scanner.service';
import { ChapterService } from './chapter.service';

@Module({
  controllers: [ChapterController],
  providers: [ChapterService, ChapterScannerService],
})
export class ChapterModule {}
```

- [ ] **Step 4: Run controller and scanner tests**

Run:

```powershell
cd backend
npm run test -- chapter.controller.spec.ts chapter-scanner.service.spec.ts
```

Expected: PASS for both test files.

- [ ] **Step 5: Commit endpoint implementation**

```powershell
git add backend/src/modules/chapter/chapter.controller.ts backend/src/modules/chapter/chapter.module.ts backend/src/modules/chapter/chapter.controller.spec.ts
git commit -m "feat: expose chapter image scan endpoint"
```

---

### Task 5: Run Full Backend Verification

**Files:**
- Verify all backend files touched by MR07.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
cd backend
npm run test -- chapter.controller.spec.ts chapter-scanner.service.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full backend test suite**

Run:

```powershell
cd backend
npm run test
```

Expected: PASS for all backend Jest suites.

- [ ] **Step 3: Run backend lint**

Run:

```powershell
cd backend
npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Run backend build**

Run:

```powershell
cd backend
npm run build
```

Expected: PASS and `dist/` updates successfully.

- [ ] **Step 5: Commit final verification fixes only if needed**

If lint or build required code changes, commit those exact changes:

```powershell
git add backend/src/modules/chapter
git commit -m "fix: satisfy MR07 verification"
```

If no code changes were needed, do not create an empty commit.
