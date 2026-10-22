# MR99: Presigned Upload URL Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace proxy file upload flow with presigned PUT URL flow; rename entity fields from URL to key.

**Architecture:** Add `generatePresignedUploadUrl()` to `FileService` which calls `minioClient.presignedPutObject()`. Two new endpoints validate metadata and return `{ uploadUrl, key, expiresIn }`. Old endpoints stay. Entity fields `coverPath`/`url` are renamed to `coverKey`/`key` across all layers with a TypeORM migration.

**Tech Stack:** NestJS, MinIO, TypeORM, class-validator, Swagger

---

### Task 1: `FileService.generatePresignedUploadUrl()` — method + tests

**Related skills:** `nestjs-best-practices` (method design, error handling), `nestjs-testing` (unit test patterns)

**Files:**
- Modify: `backend/src/modules/file/file.service.ts`
- Modify: `backend/src/modules/file/file.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add `BadRequestException` to the imports from `@nestjs/common` in `file.service.spec.ts` (currently imports `NotFoundException` and `InternalServerErrorException`).

Then add this describe block after the existing `list` describe block:

```typescript
describe('generatePresignedUploadUrl', () => {
  it('returns uploadUrl, key, and expiresIn for valid content type', async () => {
    (mockMinioClient as any).presignedPutObject = jest
      .fn()
      .mockResolvedValue('http://minio/upload-url');

    const result = await (service as any).generatePresignedUploadUrl(
      'manga/cover',
      'image/jpeg',
      5 * 1024 * 1024,
    );

    expect(result).toMatchObject({
      uploadUrl: 'http://minio/upload-url',
      key: expect.stringMatching(/^manga\/cover\/.+\.jpg$/),
      expiresIn: 3600,
    });
  });

  it('rejects unknown content type', async () => {
    (mockMinioClient as any).presignedPutObject = jest.fn();

    await expect(
      (service as any).generatePresignedUploadUrl(
        'manga/cover', 'image/avif', 1024,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes contentType to presignedPutObject', async () => {
    const presigned = jest
      .fn()
      .mockResolvedValue('http://minio/url');
    (mockMinioClient as any).presignedPutObject = presigned;

    await (service as any).generatePresignedUploadUrl(
      'manga/cover', 'image/png', 1024,
    );

    expect(presigned).toHaveBeenCalledWith(
      'test-bucket',
      expect.stringMatching(/\.png$/),
      3600,
      { contentType: 'image/png' },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest -- src/modules/file/file.service.spec.ts
```
Expected: FAIL — `generatePresignedUploadUrl is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `FileService` in `file.service.ts` after the `delete` method:

```typescript
async generatePresignedUploadUrl(
  prefix: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
  const ext = EXT_MAP[contentType];
  if (!ext) {
    throw new BadRequestException(`Unsupported content type: ${contentType}`);
  }
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const expiry = 3600;

  const uploadUrl = await this.minioClient.presignedPutObject(
    this.bucket,
    key,
    expiry,
    { contentType },
  );

  return { uploadUrl, key, expiresIn: expiry };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest -- src/modules/file/file.service.spec.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/file.service.ts backend/src/modules/file/file.service.spec.ts
git commit -m "feat: add FileService.generatePresignedUploadUrl method"
```

---

### Task 2: Presigned upload DTOs

**Related skills:** `nestjs-best-practices` (DTO design, validation decorators, Swagger)

**Files:**
- Create: `backend/src/modules/file/dto/presignedUploadCover.dto.ts`
- Create: `backend/src/modules/file/dto/presignedUploadTranslation.dto.ts`

- [ ] **Step 1: Create `PresignedUploadCoverDto`**

`backend/src/modules/file/dto/presignedUploadCover.dto.ts`:

```typescript
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadCoverDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 5 * 1024 * 1024 })
  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize: number;
}
```

- [ ] **Step 2: Create `PresignedUploadTranslationDto`**

`backend/src/modules/file/dto/presignedUploadTranslation.dto.ts`:

```typescript
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadTranslationDto {
  @ApiProperty({ example: 'application/zip' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 50 * 1024 * 1024 })
  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024)
  fileSize: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  mangaId: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  chapterNumber: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/file/dto/presignedUploadCover.dto.ts backend/src/modules/file/dto/presignedUploadTranslation.dto.ts
git commit -m "feat: add presigned upload DTOs"
```

---

### Task 3: Presigned upload controller endpoints

**Related skills:** `nestjs-best-practices` (controller structure, validation, Swagger), `nestjs-testing` (controller test patterns)

**Files:**
- Modify: `backend/src/modules/file/file.controller.ts`
- Modify: `backend/src/modules/file/file.controller.spec.ts`

- [ ] **Step 1: Write failing tests**

Add two new describe blocks to `file.controller.spec.ts` after the download tests. The existing `mockFileService` mock needs `generatePresignedUploadUrl` added to it:

```typescript
// In mockFileService object, add:
generatePresignedUploadUrl: jest.fn(),
```

Tests for cover endpoint:

```typescript
describe('POST /files/presigned-upload/cover', () => {
  it('returns uploadUrl, key, expiresIn for valid image', async () => {
    const mockResult = {
      uploadUrl: 'http://minio/upload',
      key: 'manga/cover/uuid.jpg',
      expiresIn: 3600,
    };
    mockFileService.generatePresignedUploadUrl.mockResolvedValue(mockResult);

    const result = await controller.presignedUploadCover({
      contentType: 'image/jpeg',
      fileSize: 5 * 1024 * 1024,
    });

    expect(result).toEqual(mockResult);
    expect(mockFileService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      'manga/cover',
      'image/jpeg',
      5 * 1024 * 1024,
    );
  });
});
```

Tests for translation endpoint:

```typescript
describe('POST /files/presigned-upload/translation', () => {
  it('returns presigned info for valid translation file', async () => {
    const mockResult = {
      uploadUrl: 'http://minio/upload',
      key: 'manga/1/chapter/5/translations/uuid.zip',
      expiresIn: 3600,
    };
    mockFileService.generatePresignedUploadUrl.mockResolvedValue(mockResult);

    const result = await controller.presignedUploadTranslation({
      contentType: 'application/zip',
      fileSize: 50 * 1024 * 1024,
      mangaId: 1,
      chapterNumber: 5,
    });

    expect(result).toEqual(mockResult);
    expect(mockFileService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      'manga/1/chapter/5/translations',
      'application/zip',
      50 * 1024 * 1024,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest -- src/modules/file/file.controller.spec.ts
```
Expected: FAIL — `presignedUploadCover is not a function`

- [ ] **Step 3: Add endpoints to controller**

Add to `file.controller.ts` after the `delete` endpoint:

```typescript
import { PresignedUploadCoverDto } from './dto/presignedUploadCover.dto';
import { PresignedUploadTranslationDto } from './dto/presignedUploadTranslation.dto';

const PRESIGNED_COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PRESIGNED_TRANSLATION_MIME_TYPES = ['application/zip', 'application/vnd.comicbook+zip'];

@Post('presigned-upload/cover')
@ApiOperation({ summary: 'Get presigned upload URL for cover image' })
@ApiBody({ type: PresignedUploadCoverDto })
async presignedUploadCover(
  @Body() dto: PresignedUploadCoverDto,
) {
  if (!PRESIGNED_COVER_MIME_TYPES.includes(dto.contentType)) {
    throw new BadRequestException(
      `Unsupported cover content type. Allowed: ${PRESIGNED_COVER_MIME_TYPES.join(', ')}`,
    );
  }
  if (dto.fileSize > 10 * 1024 * 1024) {
    throw new BadRequestException('Cover file size must not exceed 10 MB');
  }
  return this.fileService.generatePresignedUploadUrl('manga/cover', dto.contentType, dto.fileSize);
}

@Post('presigned-upload/translation')
@ApiOperation({ summary: 'Get presigned upload URL for translation file' })
@ApiBody({ type: PresignedUploadTranslationDto })
async presignedUploadTranslation(
  @Body() dto: PresignedUploadTranslationDto,
) {
  if (!PRESIGNED_TRANSLATION_MIME_TYPES.includes(dto.contentType)) {
    throw new BadRequestException(
      `Unsupported translation content type. Allowed: ${PRESIGNED_TRANSLATION_MIME_TYPES.join(', ')}`,
    );
  }
  if (dto.fileSize > 100 * 1024 * 1024) {
    throw new BadRequestException('Translation file size must not exceed 100 MB');
  }
  const prefix = `manga/${dto.mangaId}/chapter/${dto.chapterNumber}/translations`;
  return this.fileService.generatePresignedUploadUrl(prefix, dto.contentType, dto.fileSize);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest -- src/modules/file/file.controller.spec.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/file/file.controller.ts backend/src/modules/file/dto/ backend/src/modules/file/file.controller.spec.ts
git commit -m "feat: add presigned upload controller endpoints"
```

---

### Task 4: Rename entity fields (`coverPath` → `coverKey`, `url` → `key`)

**Related skills:** `nestjs-best-practices` (TypeORM entity patterns)

**Files:**
- Modify: `backend/src/modules/manga/entities/manga.entity.ts`
- Modify: `backend/src/modules/manga/entities/translation.entity.ts`

- [ ] **Step 1: Rename `coverPath` → `coverKey` in `manga.entity.ts`**

Change line 54-55:
```typescript
@Column({ nullable: true })
coverKey?: string;
```

- [ ] **Step 2: Rename `url` → `key` in `translation.entity.ts`**

Change line 35-36:
```typescript
@Column()
key: string;
```

- [ ] **Step 3: Run build to verify compile errors**

```bash
cd backend && npm run build
```
Expected: FAIL — many compile errors in DTOs, services, tests referencing old field names

- [ ] **Step 4: Commit entity changes**

```bash
git add backend/src/modules/manga/entities/manga.entity.ts backend/src/modules/manga/entities/translation.entity.ts
git commit -m "refactor: rename coverPath→coverKey, url→key in entities"
```

---

### Task 5: Update DTOs for renamed fields

**Related skills:** `nestjs-best-practices` (DTO consistency, Swagger decorator updates)

**Files:**
- Modify: `backend/src/modules/manga/dto/manga.dto.ts`
- Modify: `backend/src/modules/manga/dto/chapter.dto.ts`
- Modify: `backend/src/modules/manga/dto/translation.dto.ts`

- [ ] **Step 1: Update `manga.dto.ts`**

Rename `coverPath` → `coverKey` in three places:
- `MangaResponse` line 42: `coverKey?: string;` + `@ApiPropertyOptional()` stays
- `CreateMangaDto` line 130: `coverKey?: string;` + keep validators. Update `@ApiPropertyOptional({ example: 'manga/cover/uuid.jpg' })`
- `UpdateMangaDto` line 173: `coverKey?: string;` + keep validators. Update `@ApiPropertyOptional({ example: 'manga/cover/uuid.jpg' })`

Also rename `url` → `key` in `ChapterTranslationResponse` line 65:
```typescript
@ApiProperty()
key: string;
```

- [ ] **Step 2: Update `chapter.dto.ts`**

Rename `url` → `key` in `CreateChapterDto` line 35:
```typescript
@ApiProperty({ example: 'manga/1/chapter/1/translations/uuid.zip' })
@IsString()
@MinLength(1)
key: string;
```

- [ ] **Step 3: Update `translation.dto.ts`**

Rename `url` → `key` in two places:
- `UpdateTranslationDto` line 19: `key?: string;` + update `@ApiPropertyOptional({ example: 'manga/1/chapter/1/translations/new-uuid.zip' })`
- `TranslationDetailResponse` line 27: `key: string;`

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/dto/manga.dto.ts backend/src/modules/manga/dto/chapter.dto.ts backend/src/modules/manga/dto/translation.dto.ts
git commit -m "refactor: update DTO field names coverPath→coverKey, url→key"
```

---

### Task 6: Update services and repository for renamed fields

**Related skills:** `nestjs-best-practices` (service layer, repository patterns)

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.ts`
- Modify: `backend/src/modules/manga/services/chapter.service.ts`
- Modify: `backend/src/modules/manga/services/translation.service.ts`
- Modify: `backend/src/modules/manga/services/import-manga.service.ts`
- Modify: `backend/src/modules/manga/repositories/manga.repository.ts`

- [ ] **Step 1: Update `manga.service.ts`**

Replace all `coverPath` → `coverKey`:
- Line 74: `coverKey: manga.coverKey ?? undefined,`
- Line 144: `coverKey: dto.coverKey,`
- Line 169: `if (dto.coverKey !== undefined) {`
- Line 170: `if (existing.coverKey && existing.coverKey !== dto.coverKey) {`
- Line 171-172: update `extractKeyFromUrl` args — these still expect a full URL but we're now storing keys. Since old endpoints remain, the service may receive full URLs from the old flow. **Keep `extractKeyFromUrl` calls as-is** — they'll be refactored in a future task when the download flow changes. Only rename the field access:
- Line 180: `updateData.coverKey = dto.coverKey;`
- Line 228: `if (existing.coverKey) {`
- Line 229-230: same — keep `extractKeyFromUrl` call as-is

- [ ] **Step 2: Update `chapter.service.ts`**

Replace all `url` → `key`:
- Line 60: `key: dto.key,`
- Line 76: `key: dto.key,`

- [ ] **Step 3: Update `translation.service.ts`**

Replace all `url` → `key`:
- Line 73: `key: translation.key,`
- Line 119: `if (dto.key !== undefined) {`
- Line 120: `partial.key = dto.key;`
- Line 140-142: `if (dto.key !== undefined && translation.key && translation.key !== dto.key) {`
- Line 144-145: keep `extractKeyFromUrl` call as-is
- Line 177: `if (translation.key) {`
- Line 178-179: keep `extractKeyFromUrl` call as-is

- [ ] **Step 4: Update `import-manga.service.ts`**

Replace `coverPath` → `coverKey`:
- Line 81-82: `const coverKey = row[Object.keys(row).find((k) => normalizeKey(k) === 'coverkey') ?? ''];`
- Line 107: `coverKey: coverKey?.trim() || undefined,`

**Note:** The CSV import header expects `coverkey` in the file. This is an input format change. Document that existing CSV files with `coverpath` header must be updated.

- [ ] **Step 5: Update `manga.repository.ts`**

Replace line 111:
```typescript
if (data.coverKey !== undefined) manga.coverKey = data.coverKey;
```

- [ ] **Step 6: Run build to verify it compiles**

```bash
cd backend && npm run build
```
Expected: PASS (tests may still fail due to old field names in spec files)

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/manga/services/ backend/src/modules/manga/repositories/
git commit -m "refactor: update service and repository field names to coverKey/key"
```

---

### Task 7: Update spec files for renamed fields

**Related skills:** `nestjs-testing` (test mock/data updates), `javascript-typescript-jest` (test patterns)

**Files to modify (all under `backend/src/`):**
- `modules/file/file.service.spec.ts`
- `modules/file/file.controller.spec.ts`
- `modules/manga/services/manga.service.spec.ts`
- `modules/manga/services/chapter.service.spec.ts`
- `modules/manga/services/translation.service.spec.ts`
- `modules/manga/repositories/manga.repository.spec.ts`
- `modules/manga/repositories/translation.repository.spec.ts`

**Search-and-replace pattern across all spec files:**

| Old | New |
|-----|-----|
| `coverPath:` | `coverKey:` |
| `.coverPath` | `.coverKey` |
| `coverPath,` | `coverKey,` |
| `url: ` | `key: ` |
| `.url` | `.key` |
| `url,` | `key,` |
| `'url'` | `'key'` |

- [ ] **Step 1: Update `file.service.spec.ts`**

If any mock data uses `coverPath` or `url`, update to `coverKey`/`key`.

- [ ] **Step 2: Update `file.controller.spec.ts`**

Same — update any references.

- [ ] **Step 3: Update `manga.service.spec.ts`**

Replace all `coverPath:` and `.coverPath` instances with `coverKey:` / `.coverKey`.
Replace all `url:` and `.url` instances in translation mocks with `key:` / `.key`.

- [ ] **Step 4: Update `chapter.service.spec.ts`**

Replace all `url:` / `.url` → `key:` / `.key`.

- [ ] **Step 5: Update `translation.service.spec.ts`**

Replace all `url:` / `.url` → `key:` / `.key`.

- [ ] **Step 6: Update `manga.repository.spec.ts`**

Replace all `coverPath:` / `.coverPath` → `coverKey:` / `.coverKey`.
Replace all `url:` / `.url` → `key:` / `.key`.

- [ ] **Step 7: Update `translation.repository.spec.ts`**

Replace all `url:` → `key:`.

- [ ] **Step 8: Run all tests**

```bash
cd backend && npm run test
```
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/file/file.service.spec.ts backend/src/modules/file/file.controller.spec.ts backend/src/modules/manga/services/manga.service.spec.ts backend/src/modules/manga/services/chapter.service.spec.ts backend/src/modules/manga/services/translation.service.spec.ts backend/src/modules/manga/repositories/manga.repository.spec.ts backend/src/modules/manga/repositories/translation.repository.spec.ts
git commit -m "refactor: update spec files for coverKey/key field names"
```

---

### Task 8: Create TypeORM migration for column renames + data migration

**Related skills:** `nestjs-best-practices` (TypeORM migration patterns, data migration safety)

**Files:**
- Create: `backend/src/common/migrations/XXXXXX-RenameCoverPathToCoverKeyAndUrlToKey.ts`

- [ ] **Step 1: Generate migration file**

```bash
cd backend && npx typeorm migration:create src/common/migrations/RenameCoverPathToCoverKeyAndUrlToKey
```

This creates a file like `backend/src/common/migrations/1712345678901-RenameCoverPathToCoverKeyAndUrlToKey.ts`.

- [ ] **Step 2: Write the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCoverPathToCoverKeyAndUrlToKey implements MigrationInterface {
  name = 'RenameCoverPathToCoverKeyAndUrlToKey1712345678901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename columns
    await queryRunner.query(`ALTER TABLE "manga" RENAME COLUMN "coverPath" TO "coverKey"`);
    await queryRunner.query(`ALTER TABLE "translation" RENAME COLUMN "url" TO "key"`);

    // Strip full MinIO URL prefix from existing manga coverKey values
    // Pattern: http(s)://host:port/bucket/ -> extract everything after /bucket/
    await queryRunner.query(`
      UPDATE "manga"
      SET "coverKey" = regexp_replace("coverKey", '^https?://[^/]+/[^/]+/', '')
      WHERE "coverKey" ~ '^https?://'
    `);

    // Strip full MinIO URL prefix from existing translation key values
    await queryRunner.query(`
      UPDATE "translation"
      SET "key" = regexp_replace("key", '^https?://[^/]+/[^/]+/', '')
      WHERE "key" ~ '^https?://'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "translation" RENAME COLUMN "key" TO "url"`);
    await queryRunner.query(`ALTER TABLE "manga" RENAME COLUMN "coverKey" TO "coverPath"`);
  }
}
```

**Note:** The `regexp_replace` pattern strips `http(s)://host:port/bucket/` to leave just the key. This works for both Docker (`http://minio:9000/bucket/...`) and local dev (`http://localhost:9000/bucket/...`). If Postgres is not the database, adjust SQL dialect accordingly.

- [ ] **Step 3: Run migration in dev**

```bash
cd backend && npm run build && npx typeorm migration:run -d dist/data-source.js
```
Expected: Migrations run successfully. Data prefix stripping works.

- [ ] **Step 4: Verify build + tests still pass**

```bash
cd backend && npm run build && npm run test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/migrations/
git commit -m "feat: add migration to rename coverPath→coverKey and url→key"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full build**

```bash
cd backend && npm run build
```
Expected: SUCCESS

- [ ] **Step 2: Full test suite**

```bash
cd backend && npm run test
```
Expected: All tests PASS

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "chore: mr99 presigned upload implementation complete"
```
