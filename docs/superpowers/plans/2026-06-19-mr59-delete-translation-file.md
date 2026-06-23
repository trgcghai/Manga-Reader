# MR59 — Delete Translation File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the old CBZ file from Minio when a translation URL is updated or a translation record is deleted.

**Architecture:** Inject `FileService` into `TranslationService` and use `extractKeyFromUrl` to extract the Minio key from the existing URL, matching the exact pattern in `MangaService`. Delete failures propagate (hard failure).

**Tech Stack:** NestJS, TypeORM, Minio

---

### Task 1: Inject FileService and add file deletion to TranslationService

**Files:**
- Modify: `backend/src/modules/manga/services/translation.service.ts`
- Test: `backend/src/modules/manga/services/translation.service.spec.ts`
- Reference: `backend/src/modules/manga/services/manga.service.ts` (lines 169-181 and 228-236)

- [ ] **Step 1: Add imports and constructor injection**

  Add to `translation.service.ts`:
  ```typescript
  import { FileService } from 'src/modules/file/file.service';
  import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';
  ```

  Add to constructor:
  ```typescript
  private readonly fileService: FileService,
  ```

- [ ] **Step 2: Add file deletion to `update()` method**

  Inside `update()`, after the uniqueness conflict check block and before `translationRepo.update()`, add:
  ```typescript
  if (dto.url !== undefined && translation.url) {
    const key = extractKeyFromUrl(
      translation.url,
      this.fileService.endpoint,
      this.fileService.bucket,
    );
    if (key) {
      await this.fileService.delete(key);
    }
  }
  ```

  Final `update()` method structure:
  ```
  load translation → ownership checks → build partial → uniqueness check → DELETE OLD FILE → repo.update
  ```

- [ ] **Step 3: Add file deletion to `delete()` method**

  Inside `delete()`, after ownership checks and before `translationRepo.delete()`, add:
  ```typescript
  if (translation.url) {
    const key = extractKeyFromUrl(
      translation.url,
      this.fileService.endpoint,
      this.fileService.bucket,
    );
    if (key) {
      await this.fileService.delete(key);
    }
  }
  ```

  Final `delete()` method structure:
  ```
  load translation → ownership checks → DELETE FILE → repo.delete
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  cd backend && npx tsc --noEmit
  ```
  Expected: No errors

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/manga/services/translation.service.ts
  git commit -m "feat: inject FileService and delete old translation file on update/delete"
  ```

---

### Task 2: Add and update tests for file deletion

**Files:**
- Modify: `backend/src/modules/manga/services/translation.service.spec.ts`
- Reference: `backend/src/modules/manga/services/manga.service.spec.ts` for mock pattern

- [ ] **Step 1: Add FileService mock**

  Add import:
  ```typescript
  import { FileService } from 'src/modules/file/file.service';
  ```

  Add mock before `beforeEach`:
  ```typescript
  const mockFileService = {
    endpoint: 'http://localhost:9000',
    bucket: 'manga-pages',
    delete: jest.fn(),
  };
  ```

  Add to providers array in `beforeEach`:
  ```typescript
  { provide: FileService, useValue: mockFileService },
  ```

- [ ] **Step 2: Update the existing `translation` mock to have a proper URL**

  Change:
  ```typescript
  url: '/path',
  ```
  To:
  ```typescript
  url: 'http://localhost:9000/manga-pages/manga/10/chapter/5/translations/old-file.cbz',
  ```

  (This ensures `extractKeyFromUrl` will extract a valid key.)

- [ ] **Step 3: Add update test — deletes old file when new URL provided**

  Add to `describe('update')` block:
  ```typescript
  it('should delete old file when new URL is provided', async () => {
    mockTranslationRepo.findById.mockResolvedValue(translation);
    mockLanguageService.findOne.mockResolvedValue({ id: 2, code: 'fr', name: 'French' } as Language);
    mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(null);
    mockTranslationRepo.update.mockResolvedValue({ ...translation, url: '/new/path' });

    await service.update(10, 5, 1, dto);

    expect(mockFileService.delete).toHaveBeenCalledWith(
      'manga/10/chapter/5/translations/old-file.cbz',
    );
  });
  ```

- [ ] **Step 4: Add update test — does not delete when URL unchanged**

  Add to `describe('update')` block:
  ```typescript
  it('should not delete file when URL is not provided', async () => {
    mockTranslationRepo.findById.mockResolvedValue(translation);
    const dtoNoUrl: UpdateTranslationDto = { languageId: 2 };
    mockLanguageService.findOne.mockResolvedValue({ id: 2, code: 'fr', name: 'French' } as Language);
    mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(null);
    mockTranslationRepo.update.mockResolvedValue({ ...translation, language: { id: 2 } });

    await service.update(10, 5, 1, dtoNoUrl);

    expect(mockFileService.delete).not.toHaveBeenCalled();
  });
  ```

- [ ] **Step 5: Add update test — propagates file delete error**

  Add to `describe('update')` block:
  ```typescript
  it('should propagate file delete error', async () => {
    mockTranslationRepo.findById.mockResolvedValue(translation);
    mockLanguageService.findOne.mockResolvedValue({ id: 2, code: 'fr', name: 'French' } as Language);
    mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(null);
    mockFileService.delete.mockRejectedValue(new Error('Minio error'));

    await expect(service.update(10, 5, 1, dto)).rejects.toThrow('Minio error');
  });
  ```

- [ ] **Step 6: Add delete test — deletes file when translation has URL**

  Add to `describe('delete')` block:
  ```typescript
  it('should delete file when translation has a URL', async () => {
    mockTranslationRepo.findById.mockResolvedValue(translation);
    mockTranslationRepo.delete.mockResolvedValue(undefined);

    await service.delete(10, 5, 1);

    expect(mockFileService.delete).toHaveBeenCalledWith(
      'manga/10/chapter/5/translations/old-file.cbz',
    );
    expect(mockTranslationRepo.delete).toHaveBeenCalledWith(1);
  });
  ```

- [ ] **Step 7: Add delete test — does not delete when no URL**

  Add to `describe('delete')` block:
  ```typescript
  it('should not delete file when translation has no URL', async () => {
    const noUrlTranslation = { ...translation, url: null };
    mockTranslationRepo.findById.mockResolvedValue(noUrlTranslation);
    mockTranslationRepo.delete.mockResolvedValue(undefined);

    await service.delete(10, 5, 1);

    expect(mockFileService.delete).not.toHaveBeenCalled();
  });
  ```

- [ ] **Step 8: Add delete test — propagates file delete error**

  Add to `describe('delete')` block:
  ```typescript
  it('should propagate file delete error', async () => {
    mockTranslationRepo.findById.mockResolvedValue(translation);
    mockFileService.delete.mockRejectedValue(new Error('Minio error'));

    await expect(service.delete(10, 5, 1)).rejects.toThrow('Minio error');
  });
  ```

- [ ] **Step 9: Run tests to verify**

  ```bash
  cd backend && npm test
  ```
  Expected: All translation.service tests pass (including existing ones)

- [ ] **Step 10: Commit**

  ```bash
  git add backend/src/modules/manga/services/translation.service.spec.ts
  git commit -m "test: add tests for translation file deletion on update/delete"
  ```

---

### Verification

- [ ] Run TypeScript check:

  ```bash
  cd backend && npx tsc --noEmit
  ```
  Expected: No errors

- [ ] Run full test suite:

  ```bash
  cd backend && npm test
  ```
  Expected: All tests green
