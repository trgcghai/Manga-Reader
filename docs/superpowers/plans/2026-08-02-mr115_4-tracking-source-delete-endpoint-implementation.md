# MR115_4 — DELETE /tracking-sources/:id Delete Tracking Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `DELETE /tracking-sources/:id` endpoint that hard deletes a tracking source, returning `204` with no body, and `404` when the source does not exist.

**Architecture:** Follows the existing fetch-then-delete pattern used by Author/Genre/Translator/Manga services: service fetches via `findSourceById` → throws `NotFoundException` if missing → delegates to the existing `TrackingRepository.deleteSource`. Controller sets `@HttpCode(HttpStatus.NO_CONTENT)` for 204 and documents the endpoint with Swagger.

**Tech Stack:** NestJS 11, TypeScript, TypeORM, @nestjs/swagger, Jest

**Process:** Strict TDD — failing test first, then implementation, then green. Commit after each task.

**Related skills:** `test-driven-development`, `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `verification-before-completion`

---

## Current State

- `TrackingRepository.deleteSource(id): Promise<boolean>` already exists (tracking.repository.ts:102) — returns `(result.affected ?? 0) > 0`. **No repository changes needed.**
- `findSourceById(id)` exists and loads the `manga` relation — sufficient for the existence check.
- No `DELETE` handler exists in `TrackingController` yet.
- The 204-on-delete precedent exists in `manga.controller.ts:218` (`@HttpCode(HttpStatus.NO_CONTENT)`).

---

## File Structure

**Modified files:**
- `backend/src/modules/tracking/tracking.service.ts`
- `backend/src/modules/tracking/tracking.service.spec.ts`
- `backend/src/modules/tracking/tracking.controller.ts`
- `backend/src/modules/tracking/tracking.controller.spec.ts`

---

### Task 1 (TDD): Write failing service test → implement deleteSource → pass

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (service-layer)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add `deleteSource` mock and tests to service spec**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.spec.ts`.

**Change A:** Add `deleteSource: jest.fn()` to the `useValue` object for `TrackingRepository` in `beforeEach`. The full `useValue` should become:

```typescript
useValue: {
  findAllSources: jest.fn(),
  findAllSourcesPaginated: jest.fn(),
  createSource: jest.fn(),
  findSourceById: jest.fn(),
  findByMangaIdAndNameExcludingId: jest.fn(),
  findByMangaIdAndUrlExcludingId: jest.fn(),
  updateSource: jest.fn(),
  deleteSource: jest.fn(),
},
```

**Change B:** Add this `describe` block for `deleteSource` inside the outer `describe('TrackingService')`, AFTER the `updateSource` block and BEFORE the final closing `});`:

```typescript
  describe('deleteSource', () => {
    const existingSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a source successfully', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.deleteSource.mockResolvedValue(true);

      await service.deleteSource(1);

      expect(trackingRepo.findSourceById).toHaveBeenCalledWith(1);
      expect(trackingRepo.deleteSource).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.deleteSource(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.deleteSource).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `deleteSource` is not defined on `TrackingService`.

- [ ] **Step 3: Implement deleteSource in service**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.ts`.

Add the method after `updateSource`, before the closing `}` of the class:

```typescript
  deleteSource = async (id: number): Promise<void> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }
    await this.trackingRepository.deleteSource(id);
  };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — 18 tests pass (16 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add deleteSource method to service with 404 check"
```

---

### Task 2 (TDD): Write failing controller test → implement DELETE endpoint → pass

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (api-design)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Add deleteSource mock and test to controller spec**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.spec.ts`.

**Change A:** Add `deleteSource: jest.fn()` to the mock `useValue` for `TrackingService`. The full `useValue` should become:

```typescript
useValue: {
  getStatus: jest.fn(),
  createSource: jest.fn(),
  findAllSources: jest.fn(),
  updateSource: jest.fn(),
  deleteSource: jest.fn(),
},
```

**Change B:** Add this `describe` block for `delete`, AFTER the `update` block and BEFORE the final closing `});`:

```typescript
  describe('delete', () => {
    it('should delete a source and return no body', async () => {
      service.deleteSource.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(result).toBeUndefined();
      expect(service.deleteSource).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when source not found', async () => {
      service.deleteSource.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: FAIL — `delete` is not defined on `TrackingController`.

- [ ] **Step 3: Implement DELETE endpoint in controller**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.ts`.

**Change A:** Add `Delete`, `HttpCode`, `HttpStatus` to the `@nestjs/common` import. The import should become:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
```

**Change B:** Add `ApiNoContentResponse` to the `@nestjs/swagger` import. The import should become:

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
  ApiParam,
  ApiNoContentResponse,
} from '@nestjs/swagger';
```

**Change C:** Add the `delete` method after `update`:

```typescript
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Tracking source deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.trackingService.deleteSource(parseInt(id, 10));
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: PASS — 13 tests pass (11 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.spec.ts backend/src/modules/tracking/tracking.controller.ts
git commit -m "feat: add DELETE /tracking-sources/:id endpoint with 204 response"
```

---

### Task 3: Verify full suite, lint, build, and Swagger docs

**Skills:** `verification-before-completion`, `nestjs-best-practices`

- [ ] **Step 1: Run all tracking tests**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: All tracking tests pass.

- [ ] **Step 2: Run full test suite**

```bash
cd backend && npm run test
```

Expected: All test suites pass.

- [ ] **Step 3: Run lint**

```bash
cd backend && npm run lint
```

Expected: No new lint errors in tracking module files.

- [ ] **Step 4: Run build (confirms Swagger decorators compile)**

```bash
cd backend && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Verify Swagger docs include the endpoint**

Start the dev server, then check the OpenAPI JSON contains the DELETE operation:

```bash
cd backend && npm run start:dev
```

In a second terminal:

```bash
curl http://localhost:3000/api-json | findstr /C:"DELETE" /C:"tracking-sources"
```

Expected: The DELETE operation appears under the `Tracking Sources` tag. Then stop the dev server (Ctrl+C).

- [ ] **Step 6: Commit if any leftover changes**

```bash
git status
```

Expected: Working tree clean (all changes already committed in Tasks 1–2). If anything is dirty, commit it with a message describing the change.

---

## Self-Review Checklist

1. **TDD compliance:** Tasks 1–2 follow red-green-refactor (failing test → minimal implementation → green).
2. **Spec coverage:** 204 success with no body (service returns `void`, controller `@HttpCode(NO_CONTENT)`), 404 not found (service `NotFoundException`, propagated by controller), deleted source gone from list (hard delete via `sourceRepo.delete(id)` — no repository changes needed since `deleteSource` already exists).
3. **Type consistency:** `deleteSource` is named identically across repository, service, and controller; controller method returns `Promise<void>` matching the service signature.
4. **Swagger:** `@ApiOperation`, `@ApiParam`, `@ApiNoContentResponse` present; build step verifies compilation; Step 5 verifies the generated docs.
5. **No placeholders:** every step contains concrete code or commands.
