# MR38: Import Excel to Bulk Create Manga — Design

## Overview

Allow admins to upload an `.xlsx` file from the manga list page to create multiple manga entries at once. The backend parses the worksheet, validates each row independently, and bulk-creates manga with authors/genres. Partial success is reported back.

## Approach

**Backend: Approach A** — Dedicated `ImportMangaService` for parsing + batch creation.
**Frontend:** Dialog on `/admin/mangas` list page with drag-and-drop, template download, and result summary.

---

## Backend

### Dependency

Add `xlsx` (SheetJS) to `backend/package.json`.

### Endpoint

```
POST /mangas/import
Content-Type: multipart/form-data
Body: file (required, .xlsx)
```

Returns `201` with:
```json
{
  "total": 4,
  "created": 3,
  "errors": [
    { "row": 2, "message": "Title is required" }
  ]
}
```

Returns `400` if file is missing or not `.xlsx`.

### File Upload

Use NestJS built-in `@nestjs/platform-express` multer via:
- `@UseInterceptors(FileInterceptor('file'))`
- Memory storage (excel files are small)
- File size limit: 10MB

### Controller — MangaController

Add method to existing `MangaController`:

```
POST /mangas/import  →  import(@UploadedFile() file) → ImportResult
```

Delegates to `ImportMangaService.import(file)`. No auth (app is local-only).

### ImportMangaService

New service in `src/modules/manga/services/import-manga.service.ts`.

**Methods:**

1. `parseExcel(buffer: Buffer): RawRow[]`
   - Reads workbook's first sheet via `xlsx.read(buffer, { type: 'buffer' })`
   - First row = headers (case-insensitive, trimmed)
   - Returns array of key-value maps

2. `rowToCreateMangaDto(row: RawRow): CreateMangaDto`
   - Maps columns: `Title` → `title`, `Status` → `status`, etc.
   - Multi-value columns (`Authors`, `Genres`, `Alternative Titles`) use a `parseCsvCell()` helper:
     - Split by comma, but respect double-quoted values: `"Action, Adventure"` stays as one item
     - Trim whitespace from each item
   - Validates required fields (Title, Status)

3. `import(file: Express.Multer.File): Promise<ImportResult>`
   - Calls `parseExcel` to get rows
   - Iterates rows with index:
     - Convert to `CreateMangaDto` via `rowToCreateMangaDto`
     - Call `this.mangaService.create(dto)` (reuses existing logic including `findOrCreate`)
     - On success: increment `created`
     - On error: push `{ row: i + 1, message }` to errors
   - Never rolls back — partial success is the contract

**Edge cases:**
- Empty file / no data rows → `{ total: 0, created: 0, errors: [] }`
- All rows fail → `{ total: N, created: 0, errors: [...] }`
- Missing columns → row-level validation error
- Extra unknown columns → ignored (whitelist approach)

### Column Format

| Header | Required | Type | Notes |
|--------|----------|------|-------|
| Title | Yes | string | |
| Status | Yes | string | One of: ongoing, completed, paused |
| Description | No | string | |
| Alternative Titles | No | string | Comma-separated, CSV-quoted |
| Cover Path | No | string | |
| Authors | No | string | Comma-separated, CSV-quoted |
| Genres | No | string | Comma-separated, CSV-quoted |

### Template File

A minimal `.xlsx` with only the header row is provided for download from the frontend.

---

## Frontend

### Route

No new route. Import is part of the existing `/admin/mangas` page.

### Import Button

Add "Import Excel" button next to the "Create New" button on the manga list page header.

### ImportDialog Component

Reusable dialog component:

1. **Trigger:** Clicks on "Import Excel" button
2. **Dialog content:**
   - "Download template" link — generates a minimal `.xlsx` with headers
   - Drag-and-drop zone (shows dashed border on hover)
   - "Browse files" fallback button
   - File type restriction: `.xlsx`
   - Selected file name displayed once chosen
   - "Import" button (disabled until file selected, shows spinner during upload)
3. **After import:**
   - Keep dialog open
   - Show success count: `✅ X manga created successfully`
   - Show error list (if any): per-row messages
   - "Close" button to dismiss

### API Hook

**`mangaApi.ts`** — new `importMangas(file: File)` function:
```typescript
export const importMangas = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post<ImportResult>('/mangas/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

**`useImportMangas`** hook — `useMutation` pattern:
- Mutation key: `['mangas', 'import']`
- Returns `ImportResult`
- `onSuccess`: invalidates `['mangas']` queries to refresh list

### Types

```typescript
interface ImportResult {
  total: number;
  created: number;
  errors: Array<{ row: number; message: string }>;
}
```

---

## Testing

### Backend Unit Tests — ImportMangaService

- Parses valid Excel buffer into expected row count
- Partial success: mixed valid/invalid rows, verify count
- All rows fail: verify errors list
- Empty worksheet: zero rows
- CSV-quoted cells: `"Action, Adventure"` parsed as single item
- Missing required field: row-level validation error

### Backend Unit Tests — MangaController

- 400 when no file provided
- 400 when non-`.xlsx` file provided
- Delegates to service.import correctly

### E2E Test

- Upload fixture `.xlsx` with 3+ rows (mixed valid/invalid)
- Verify HTTP 201
- Verify `created` count matches valid rows
- Verify `errors` contains invalid row details
- Verify mangas persisted in database

### Frontend Test (ImportDialog)

- Renders file picker on open
- Import button disabled when no file selected
- Shows results after mock import resolves
