# folderPath → url Rename (MR51–53)

## Problem

The `Translation` entity uses `folderPath` to store the URL/path to a translation's image pages. This name is misleading — it's not necessarily a filesystem path, it's a URL. Rename it to `url` across the entire stack.

## Scope

| MR | Area | Change |
|----|------|--------|
| MR51 | Database + Entity | TypeORM migration renames column, entity field renamed, `synchronize` disabled permanently |
| MR52 | Backend code | DTOs, services, specs rename the field |
| MR53 | Frontend code | API types, forms, display rename the field |

## Design Decisions

### Migration location
`backend/src/common/migrations/` — shared across all modules, not domain-specific.

### synchronize strategy
Set `synchronize: false` permanently. All future schema changes require explicit migrations. This is the production-recommended pattern.

### Migration safety
The migration checks column existence before renaming: runs only if `folderPath` exists AND `url` does not. No `down` method — for a rename, entity code changes simultaneously so a revert would be inconsistent.

### TypeORM config
- `synchronize: false`
- `migrationsRun: true`
- `migrations: [RenameFolderPathToUrl]` — class reference, not glob pattern (works in both `ts` and `dist/`)

### Execution order
1. MR51: migration + entity → backend compiles
2. MR52: backend DTOs/services/specs → `npm test` passes
3. MR53: frontend types/components/routes → `npm run build` passes

## Files Changed

### MR51 — Database + Entity
| File | Change |
|------|--------|
| `backend/src/common/migrations/RenameFolderPathToUrl.ts` | **New** — migration class with `up` only |
| `backend/src/modules/manga/entities/translation.entity.ts` | `folderPath` → `url` |
| `backend/src/app.module.ts` | `synchronize: true` → `synchronize: false`, add `migrationsRun: true`, add `migrations` |

### MR52 — Backend code
| File | Occurrences | Change |
|------|-------------|--------|
| `dto/chapter.dto.ts` | 1 | `folderPath` → `url` |
| `dto/manga.dto.ts` | 1 | `folderPath` → `url` |
| `dto/translation.dto.ts` | 1 | `folderPath` → `url` |
| `services/chapter.service.ts` | 2 | `folderPath` → `url` |
| `services/translation.service.ts` | 2 | `folderPath` → `url` |
| `services/manga.service.ts` | 1 | `folderPath` → `url` |
| `services/chapter.service.spec.ts` | 4 | `folderPath` → `url` |
| `services/manga.service.spec.ts` | 1 | `folderPath` → `url` |
| `services/translation.service.spec.ts` | 6 | `folderPath` → `url` |
| `repositories/manga.repository.spec.ts` | 1 | `folderPath` → `url` |
| `repositories/translation.repository.spec.ts` | 3 | `folderPath` → `url` |
| `manga.controller.spec.ts` | 1 | `folderPath` → `url` |

### MR53 — Frontend code
| File | Occurrences | Change |
|------|-------------|--------|
| `services/api/mangaApi.ts` | 3 | 3 interface fields renamed |
| `AddChapterDialog.tsx` | 3 | `folderPath` → `url` in schema, defaults, field name |
| `AddTranslationDialog.tsx` | 4 | Same |
| `EditTranslationDialog.tsx` | 4 | Same |
| `$id.index.tsx` | 1 | `{tr.folderPath}` → `{tr.url}` |
 