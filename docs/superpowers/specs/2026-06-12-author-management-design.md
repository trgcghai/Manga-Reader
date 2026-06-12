# Author Management — Design

## Scope

Add dedicated CRUD for authors in the admin panel. Authors currently exist only as a
side-effect of manga create/update (find-or-create by name). This adds standalone
list, create, edit, and delete for authors without changing the manga form flow.

## Backend

All additions go in the existing `MangaModule` — no new module.

### AuthorRepository (extend)

Current methods: `findOneByName`, `create`

Add:

| Method | Signature | Behavior |
|--------|-----------|----------|
| `findAll` | `(search?: string, page: number, limit: number): Promise<{ data: Author[]; total: number }>` | Paginated list, optional `ILIKE` name filter |
| `findOneById` | `(id: number): Promise<Author \| null>` | Single author by PK |
| `update` | `(id: number, data: Partial<Author>): Promise<Author \| null>` | Find → mutate → save (same pattern as MangaRepository.update) |
| `delete` | `(id: number): Promise<boolean>` | Delete by PK, returns true if affected |

### AuthorService (new)

- `findAll(search?, page?, limit?)` → AuthorRepository.findAll
- `findOne(id)` → AuthorRepository.findOneById → throws NotFoundException if null
- `create(dto: { name: string })` → AuthorRepository.findOneByName → if exists, throw BadRequestException (duplicate); else AuthorRepository.create
- `update(id, dto)` → AuthorRepository.findOneById → throw NotFoundException if null; AuthorRepository.findOneByName if name changed → throw BadRequestException if name taken; AuthorRepository.update
- `delete(id)` → AuthorRepository.findOneById → throw NotFoundException if null; AuthorRepository.delete

### AuthorController (new)

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/authors` | — | `{ data: Author[]; total: number; page: number; limit: number; totalPages: number }` (with `?search=&page=&limit=`) |
| GET | `/authors/:id` | — | `Author` |
| POST | `/authors` | `{ name: string }` | `Author` (201) |
| PATCH | `/authors/:id` | `{ name?: string }` | `Author` |
| DELETE | `/authors/:id` | — | 200 / 404 |

### DTO

- `CreateAuthorDto`: `name` (string, `@IsString`, `@IsNotEmpty`)
- `UpdateAuthorDto`: `name` (string, `@IsString`, `@IsOptional`)

### Module wiring

Add `AuthorController` and `AuthorService` to `MangaModule` providers/controllers arrays.

### Tests

- `author.service.spec.ts` — 5+ tests: create success, duplicate `BadRequestException`, findOne not found, update, delete not found
- `author.controller.spec.ts` — 5+ tests: each endpoint happy path + 404/400
- `author.repository.spec.ts` — extend with findAll, findOneById, update, delete tests (8+ existing → 12+)
- `author.e2e-spec.ts` — full CRUD cycle via supertest against test database

## Frontend

### Route

`/admin/authors` → `routes/admin/authors.tsx` — single page with list table + inline dialogs.

### List page

- Table columns: Name | Mangas (#) | Actions
- Actions: Edit button (pencil icon), Delete button (trash icon)
- "Add Author" button above the table
- Search input above the table (debounced, filters by name)

Pattern reference: `routes/admin/mangas/index.tsx` (table + actions + delete dialog).

### Create dialog

- Triggered by "Add Author" button
- shadcn Dialog with a single text input (name) and Submit/Cancel buttons
- Controlled `useState` for name, simple empty-string check on submit (no zod, no tanstack form)
- On success → close dialog, invalidate `['authors']` query key, toast/snackbar optional

### Edit dialog

- Same Dialog component, opened with the author's current name pre-filled
- On success → close + invalidate

### Delete dialog

- Reuse the existing shadcn Dialog (same pattern as manga delete)
- Shows "Are you sure you want to delete {name}?" text
- On confirm → call deleteAuthor mutation → invalidate

### Data layer

- `services/api/authorApi.ts` — `getAuthors(page, limit, search?)`, `getAuthor`, `createAuthor`, `updateAuthor`, `deleteAuthor`
- `hooks/useAuthors.ts` — `useAuthorList`, `useAuthor`, `useCreateAuthor`, `useUpdateAuthor`, `useDeleteAuthor` following `useManga.ts` pattern (query key factory, invalidation on mutations)

### E2E

- `author.e2e-spec.ts` — full CRUD cycle via supertest against test database:
  - POST /authors → 201, duplicate name → 400
  - GET /authors → paginated list with/without search, verify page/limit params
  - GET /authors/:id → 200, 404
  - PATCH /authors/:id → 200, duplicate name → 400
  - DELETE /authors/:id → 200, 404

## Non-goals

- Do NOT change the manga form's free-text tag input for authors
- Do NOT add search/select author component to manga form
- Do NOT extract Author to a separate module
- Do NOT add author bio, image, or other fields
- Do NOT use zod or tanstack form for the one-field dialog

## Open questions

( None — all decisions covered )
