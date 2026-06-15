# MR13: Translator CRUD Design

## Overview

Standalone Translator CRUD feature. A translator is an entity with `name` (required, unique) and `note` (optional, multi-line text). No relations to manga, chapters, or any other module.

## Backend Architecture

### Route
`@Controller('translators')` → endpoints at `/translators`

### Module Structure
```
backend/src/modules/translator/
├── dto/
│   ├── translator.dto.ts
│   └── translator.dto.spec.ts
├── entities/
│   └── translator.entity.ts          (existing)
├── translator.module.ts              (modify)
├── translator.repository.ts          (new)
├── translator.repository.spec.ts     (new)
├── translator.service.ts             (modify)
├── translator.service.spec.ts        (modify)
├── translator.controller.ts          (modify)
└── translator.controller.spec.ts     (modify)
backend/test/translator.e2e-spec.ts   (new)
```

### Repository (`translator.repository.ts`)
- `findOneByName(name)`: exact match with whitespace trim
- `findAll(search?, page?, limit?)`: paginated `createQueryBuilder` with `ILIKE` search, no relation counts
- `findOneById(id)`
- `create(data)`: `repo.save`
- `update(id, data)`: fetch, modify, save
- `delete(id)`: `repo.delete` — no junction table cleanup needed

### Service (`translator.service.ts`)
- `findAll` → delegates to repo
- `findOne` → throws `NotFoundException` if missing
- `create` → duplicate check, throw `BadRequestException`, save with name+note
- `update` → existence check + duplicate name check
- `delete` → existence check

### DTOs
- `CreateTranslatorDto`: `name` (string, required), `note` (string, optional)
- `UpdateTranslatorDto`: `name` (string, optional), `note` (string, optional)

### Entity (existing)
- `id` (PK), `name` (unique), `note` (nullable text), `createdAt`, `updatedAt`

## Frontend Architecture

### Files
```
frontend/src/
├── services/api/translatorApi.ts
├── hooks/useTranslators.ts
├── routes/admin/translators.tsx
├── components/translator/
│   ├── AddTranslatorDialog.tsx
│   └── EditTranslatorDialog.tsx
```

### API Service (`translatorApi.ts`)
- `getTranslators(page?, limit?, search?)` → `GET /translators`
- `getTranslator(id)` → `GET /translators/:id`
- `createTranslator(payload)` → `POST /translators`
- `updateTranslator(id, payload)` → `PATCH /translators/:id`
- `deleteTranslator(id)` → `DELETE /translators/:id`

### Hooks (`useTranslators.ts`)
- TanStack Query with keys: `['translators']`, `['translators', 'list', page, limit, search]`, `['translators', 'detail', id]`
- `useTranslatorList`, `useCreateTranslator`, `useUpdateTranslator`, `useDeleteTranslator`
- Mutations invalidate `['translators']` on success + toast notifications

### Page (`/admin/translators`)
- States: Loading (skeleton rows) | Error (red card) | Empty (Empty component) | Data (Table)
- Table columns: Name | Note | Actions (edit pencil + delete trash)
- Debounced search (300ms, resets to page 1)
- Pagination component

### Dialogs
- **AddTranslatorDialog**: name (Input) + note (textarea), create on save
- **EditTranslatorDialog**: prefilled name + note, update on save

### Sidebar
- Add "Translators" link under "Manga" nav group in `AdminSidebar.tsx`

## Testing Strategy

### Unit Tests
- **DTO spec**: validation passes/fails for required fields
- **Repository spec**: mock `Repository<Translator>`, test all query/mutation methods
- **Service spec**: mock `TranslatorRepository`, test all business logic (success + error cases)
- **Controller spec**: mock `TranslatorService`, test all endpoints + error propagation

### E2E Tests
- Real PostgreSQL (port 5433), supertest
- CRUD operations + duplicate validation + pagination + 404s

## Key Differences from Author Module
- No `loadRelationCountAndMap` in repository (no relations)
- No junction table cleanup in delete
- `update` handles both `name` and `note`
- DTOs include optional `note` field
