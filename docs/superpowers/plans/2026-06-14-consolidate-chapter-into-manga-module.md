# Consolidate Chapter Into Manga Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the standalone Chapter module by moving its entities into the Manga module and removing unused code.

**Architecture:** Two entities (`Chapter`, `Translation`) are moved into `backend/src/modules/manga/entities/`. The `MangaModule` registers them via `TypeOrmModule.forFeature()`. The Chapter module files and their tests are deleted. No new service or controller is created.

**Tech Stack:** NestJS, TypeORM, TypeScript, Jest

---

### Task 1: Move entity files to manga module

**Files:**
- Create: `backend/src/modules/manga/entities/chapter.entity.ts`
- Create: `backend/src/modules/manga/entities/translation.entity.ts`
- Delete: `backend/src/modules/chapter/entities/chapter.entity.ts`
- Delete: `backend/src/modules/chapter/entities/translation.entity.ts`

- [ ] **Step 1: Copy chapter.entity.ts to manga entities**

Read `backend/src/modules/chapter/entities/chapter.entity.ts` then write it to `backend/src/modules/manga/entities/chapter.entity.ts`.

- [ ] **Step 2: Copy translation.entity.ts to manga entities**

Read `backend/src/modules/chapter/entities/translation.entity.ts` then write it to `backend/src/modules/manga/entities/translation.entity.ts`.

- [ ] **Step 3: Delete originals**

```bash
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\entities\chapter.entity.ts"
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\entities\translation.entity.ts"
```

- [ ] **Step 4: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/modules/manga/entities/chapter.entity.ts backend/src/modules/manga/entities/translation.entity.ts backend/src/modules/chapter/entities/chapter.entity.ts backend/src/modules/chapter/entities/translation.entity.ts
git commit -m "refactor: move Chapter and Translation entities to manga module"
```

---

### Task 2: Update imports in the moved entities and manga.entity.ts

**Files:**
- Modify: `backend/src/modules/manga/entities/manga.entity.ts` (line 2 import path)
- Modify: `backend/src/modules/manga/entities/chapter.entity.ts` (line 12 import path)

- [ ] **Step 1: Update manga.entity.ts import**

In `backend/src/modules/manga/entities/manga.entity.ts`, change:
```typescript
import { Chapter } from 'src/modules/chapter/entities/chapter.entity';
```
to:
```typescript
import { Chapter } from './entities/chapter.entity';
```

- [ ] **Step 2: Update chapter.entity.ts import**

In `backend/src/modules/manga/entities/chapter.entity.ts` (after the move), the Manga import:
```typescript
import { Manga } from 'src/modules/manga/entities/manga.entity';
```
should change to a relative import within the same directory:
```typescript
import { Manga } from './manga.entity';
```

The Translation import in `chapter.entity.ts` (`import { Translation } from './translation.entity'`) is already correct since Translation lives in the same directory.

- [ ] **Step 3: Verify translation.entity.ts imports**

The Translation entity imports `Chapter` from `./chapter.entity` — that's still valid since both are in the same directory. The `Language` and `Translator` imports use absolute paths (`src/modules/...`) — those stay unchanged.

- [ ] **Step 4: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/modules/manga/entities/manga.entity.ts backend/src/modules/manga/entities/chapter.entity.ts
git commit -m "refactor: update entity imports after move to manga module"
```

---

### Task 3: Update MangaModule to register Chapter and Translation entities

**Files:**
- Modify: `backend/src/modules/manga/manga.module.ts`

- [ ] **Step 1: Update TypeOrmModule.forFeature in manga.module.ts**

In `backend/src/modules/manga/manga.module.ts`:
- Add imports: `import { Chapter } from './entities/chapter.entity';` and `import { Translation } from './entities/translation.entity';`
- Change `TypeOrmModule.forFeature([Manga])` to `TypeOrmModule.forFeature([Manga, Chapter, Translation])`

- [ ] **Step 2: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/modules/manga/manga.module.ts
git commit -m "refactor: register Chapter and Translation entities in MangaModule"
```

---

### Task 4: Delete Chapter module files

**Files:**
- Delete: `backend/src/modules/chapter/chapter.module.ts`
- Delete: `backend/src/modules/chapter/chapter.controller.ts`
- Delete: `backend/src/modules/chapter/chapter.service.ts`
- Delete: `backend/src/modules/chapter/chapter.controller.spec.ts`
- Delete: `backend/src/modules/chapter/chapter.service.spec.ts`
- Delete: `backend/src/modules/chapter/__fixtures__/` (recursive)

- [ ] **Step 1: Delete all chapter module files**

```bash
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\chapter.module.ts"
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\chapter.controller.ts"
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\chapter.service.ts"
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\chapter.controller.spec.ts"
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\chapter.service.spec.ts"
Remove-Item -Recurse -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter\__fixtures__"
```

- [ ] **Step 2: Remove the now-empty chapter directory**

```bash
Remove-Item -LiteralPath "F:\Cntt\vibe\manga-reader\backend\src\modules\chapter"
```

- [ ] **Step 3: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add -A
git commit -m "refactor: remove Chapter module and its tests"
```

---

### Task 5: Update AppModule

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Remove ChapterModule import and registration**

In `backend/src/app.module.ts`:
- Remove line: `import { ChapterModule } from './modules/chapter/chapter.module';`
- Remove `ChapterModule` from the `imports` array

- [ ] **Step 2: Commit**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add backend/src/app.module.ts
git commit -m "refactor: remove ChapterModule from AppModule imports"
```

---

### Task 6: Verify everything builds and tests pass

- [ ] **Step 1: Run tests**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npm run test
```

Expected: All existing tests pass. The deleted chapter tests are no longer collected.

- [ ] **Step 2: Run build**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader\backend"
npm run build
```

Expected: Compiles without errors.

- [ ] **Step 3: Fix any issues found**

If tests fail or build breaks due to missed imports, fix them and re-run steps 1-2 until green.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
Set-Location -LiteralPath "F:\Cntt\vibe\manga-reader"
git add -A
git commit -m "fix: resolve broken imports after chapter consolidation"
```
