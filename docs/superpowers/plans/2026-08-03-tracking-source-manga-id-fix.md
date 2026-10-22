# Tracking Source List `mangaId` Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GET /tracking-sources` include `mangaId` on each item so the Manage Sources dialog's create payload is valid (fixes the 400 on add).

**Architecture:** Extract the existing inline entity→DTO mapping in `TrackingService.createSource`/`updateSource` into a single private mapper that also emits `mangaId` and a nested `manga: { id, title }` object, then apply it to the paginated list in `findAllSources`. Backend-only; no frontend changes.

**Tech Stack:** NestJS, TypeScript, TypeORM, Jest.

**Spec:** `docs/superpowers/specs/2026-08-03-tracking-source-manga-id-fix-design.md`

---

## File Structure

- Modify: `backend/src/modules/tracking/tracking.service.ts` — add private `toTrackingSourceResponseDto` mapper; use it in `createSource`, `updateSource`, `findAllSources`.
- Test: `backend/src/modules/tracking/tracking.service.spec.ts` — add regression test asserting the list maps each item to the DTO shape (mangaId present, ISO dates, `manga` preserved).

No other files change. Existing `createSource`/`updateSource` tests already cover those paths and will exercise the shared mapper after the refactor.

---

### Task 1: Write the failing regression test for `findAllSources`

**Skills:** test-driven-development, nestjs-testing, javascript-typescript-jest

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`

- [ ] **Step 1: Add the failing test**

In `backend/src/modules/tracking/tracking.service.spec.ts`, inside the `describe('findAllSources')` block (after the existing `'should return paginated sources'` test at ~line 147), add:

```ts
    it('should map each source to a response DTO including mangaId', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.findAllSources();

      expect(result.data[0]).toEqual({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'MangaDex',
        latestChapterNumber: null,
        createdAt: mockSource.createdAt.toISOString(),
        updatedAt: mockSource.updatedAt.toISOString(),
        manga: { id: 1, title: 'One Piece' },
      });
    });
```

`mockSource` (already defined in this describe block at ~line 117) has `manga: { id: 1, title: 'One Piece' }`, `createdAt`/`updatedAt` as `Date` objects — the assertion verifies the wire shape (`mangaId` present, ISO strings, `manga` kept).

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd backend && npm run test -- tracking.service.spec`

Expected: FAIL — `expect(received).toEqual(expected)` shows `result.data[0]` has no `mangaId` property and `createdAt`/`updatedAt` are `Date` objects, not ISO strings.

---

### Task 2: Implement the shared mapper and use it in `findAllSources`

**Skills:** nestjs-best-practices, test-driven-development

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add the `TrackingSource` entity import**

In `backend/src/modules/tracking/tracking.service.ts`, after the existing imports from `./dto/tracking-source.dto`, add:

```ts
import { TrackingSource } from './entities/tracking-source.entity';
```

- [ ] **Step 2: Add the private mapper**

After the constructor (after line 24), add an arrow-function property matching the file's existing class-property style:

```ts
  private toTrackingSourceResponseDto = (
    source: TrackingSource,
  ): TrackingSourceResponseDto & {
    manga: { id: number; title: string };
  } => {
    return {
      id: source.id,
      mangaId: source.manga.id,
      url: source.url,
      name: source.name,
      latestChapterNumber: source.latestChapterNumber,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      manga: { id: source.manga.id, title: source.manga.title },
    };
  };
```

- [ ] **Step 3: Map the list response in `findAllSources`**

Replace the body of `findAllSources` (currently lines 71-81):

```ts
  findAllSources = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
  ) => {
    const result = await this.trackingRepository.findAllSourcesPaginated(
      mangaId,
      page,
      limit,
    );

    return {
      ...result,
      data: result.data.map((source) =>
        this.toTrackingSourceResponseDto(source),
      ),
    };
  };
```

The pagination envelope (`total`, `page`, `limit`, `totalPages`) is preserved; only `data` items are mapped.

- [ ] **Step 4: Run the test and verify it passes**

Run: `cd backend && npm run test -- tracking.service.spec`

Expected: PASS — all tests in the file, including the new mapping test.

---

### Task 3: Refactor `createSource` and `updateSource` to use the shared mapper

**Skills:** nestjs-best-practices

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Use the mapper in `createSource`**

Replace the inline `return { ... }` block at the end of `createSource` (currently lines 60-68):

```ts
    return this.toTrackingSourceResponseDto(source);
```

- [ ] **Step 2: Use the mapper in `updateSource`**

Replace the inline `return { ... }` block at the end of `updateSource` (currently lines 129-137):

```ts
    return this.toTrackingSourceResponseDto(updated);
```

- [ ] **Step 3: Run the full tracking spec**

Run: `cd backend && npm run test -- tracking.service.spec tracking.controller.spec`

Expected: PASS — the existing create/update assertions (e.g. `result.mangaId` toBe 1, `result.name` toBe 'MangaDex') still hold and now exercise the shared mapper.

---

### Task 4: Full verification (tests, lint)

**Skills:** verification-before-completion, nestjs-testing

**Files:** none (verification only)

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && npm run test`

Expected: all tests PASS (including the new mapping test).

- [ ] **Step 2: Run the linter**

Run: `cd backend && npm run lint`

Expected: no errors or warnings introduced. (The repo uses `eslint` with the NestJS config; existing files already lint clean.)

---

### Task 5: Live verification against the running dev backend

**Skills:** verification-before-completion, systematic-debugging

**Files:** none (verification only)

The backend dev server (watch mode, port 3001) reloads automatically after the file changes. Wait a few seconds for reload, then:

- [ ] **Step 1: Confirm the list response now includes `mangaId`**

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources?page=1&limit=100" | ConvertTo-Json -Depth 6
```

Expected: each item in `data` now has `"mangaId": <number>` alongside the nested `manga` object (previously absent).

- [ ] **Step 2: Confirm the create endpoint accepts the app's payload**

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources" -Method Post -ContentType "application/json" -Body '{"mangaId":24,"name":"Temp Check","url":"https://example.com/temp-check"}'
```

Expected: 201-style success (`"success": true`) with the created source. Then delete the temp row to keep data clean:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources/<id-from-response>" -Method Delete
```

---

### Task 6: Commit

**Skills:** none

**Files:** `backend/src/modules/tracking/tracking.service.ts`, `backend/src/modules/tracking/tracking.service.spec.ts`

- [ ] **Step 1: Stage and commit only the two changed files**

```bash
git add backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.service.spec.ts
git commit -m "fix: include mangaId in tracking source list response"
```

(Only commit when the user has approved the implementation result.)
