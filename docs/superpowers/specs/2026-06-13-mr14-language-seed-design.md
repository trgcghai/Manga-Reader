# MR14: Language Seeding and List-Only API — Design

## Overview

Create a standalone `LanguageModule` with a seed mechanism that populates the Language table on application startup from a comprehensive ISO 639-1 list. Restrict the Language API to read-only (list all, no pagination). The existing `TranslatorModule` keeps Translator CRUD only.

## Approach

**Module structure: Approach A** — New `LanguageModule` following the single-entity-per-module pattern (AuthorModule, GenreModule).
**Seeding: Option 1** — Hardcoded constant array at `src/common/constants/language.constant.ts`, seed runner at `src/common/seed/language.seed.ts` using `OnApplicationBootstrap`.
**Seed scope:** All ISO 639-1 codes (~184 entries).

## Backend Design

### New directory: `src/modules/language/`

| File | Purpose |
|------|---------|
| `entities/language.entity.ts` | Moved from `translator/entities/` — identical entity |
| `language.service.ts` | `findAll()` returns all languages, no pagination, no create/update/delete |
| `language.repository.ts` | `findAll()` wrapping the TypeORM repository |
| `language.controller.ts` | `GET /language` only — no POST/PATCH/DELETE routes |
| `language.module.ts` | Imports `TypeOrmModule.forFeature([Language])`, provides `LanguageService`, `LanguageRepository`, `LanguageSeedService`; exports `LanguageService` |

### New file: `src/common/constants/language.constant.ts`

```typescript
import { Language } from 'src/modules/language/entities/language.entity';

export const LANGUAGE_SEED: Array<Pick<Language, 'code' | 'name'>> = [
  { code: 'aa', name: 'Afar' },
  { code: 'ab', name: 'Abkhazian' },
  { code: 'ae', name: 'Avestan' },
  // ... all ISO 639-1 codes (~184 entries)
  { code: 'zu', name: 'Zulu' },
];
```

### New file: `src/common/seed/language.seed.ts`

```typescript
@Injectable()
export class LanguageSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Language)
    private readonly repo: Repository<Language>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(LANGUAGE_SEED);
      console.log(`Seeded ${LANGUAGE_SEED.length} languages`);
    }
  }
}
```

- Registered in `LanguageModule.providers[]`
- Uses `@InjectRepository(Language)` — requires `TypeOrmModule.forFeature([Language])` in the same module

### Modified files

| File | Change |
|------|--------|
| `src/modules/translator/translator.module.ts` | Remove `TypeOrmModule.forFeature([Language])` if present; TranslatorModule only handles Translator entity |
| `src/modules/translator/entities/language.entity.ts` | **Delete** — moved to `language/entities/` |
| `src/modules/chapter/entities/translation.entity.ts` | Update import path: `from 'src/modules/language/entities/language.entity'` |
| `src/app.module.ts` | Add `LanguageModule` to `imports` |

### API Surface

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/language` | ✅ Returns all languages as array, no pagination |
| `POST` | `/language` | ❌ Not defined — 404 |
| `PATCH` | `/language/:id` | ❌ Not defined — 404 |
| `DELETE` | `/language/:id` | ❌ Not defined — 404 |

## Files to Create

1. `backend/src/modules/language/entities/language.entity.ts`
2. `backend/src/modules/language/language.repository.ts`
3. `backend/src/modules/language/language.repository.spec.ts`
4. `backend/src/modules/language/language.service.ts`
5. `backend/src/modules/language/language.service.spec.ts`
6. `backend/src/modules/language/language.controller.ts`
7. `backend/src/modules/language/language.controller.spec.ts`
8. `backend/src/modules/language/language.module.ts`
9. `backend/src/common/constants/language.constant.ts`
10. `backend/src/common/seed/language.seed.ts`
11. `backend/src/common/seed/language.seed.spec.ts`

## Files to Modify

1. `backend/src/modules/translator/entities/language.entity.ts` — **delete**
2. `backend/src/modules/translator/translator.module.ts` — remove Language references
3. `backend/src/modules/chapter/entities/translation.entity.ts` — update import path
4. `backend/src/app.module.ts` — import LanguageModule

## What This MR Does NOT Include

- Translator CRUD (MR13 — separate MR)
- Language endpoints beyond findAll (no create, update, delete)
- Pagination for language list
- Any relation between Language and Manga
- Changes to the Translation entity's behavior (only import path update)
