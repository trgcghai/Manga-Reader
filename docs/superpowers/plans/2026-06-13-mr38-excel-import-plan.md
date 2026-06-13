# MR38: Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to upload an `.xlsx` file to bulk create manga entries via a dialog on the manga list page.

**Architecture:** Backend uses a dedicated `ImportMangaService` that parses the Excel via `xlsx` library, validates each row, and delegates creation to existing `MangaService.create()`. Partial success returns `{ total, created, errors }`. Frontend adds an "Import Excel" button on `/admin/mangas` that opens a dialog with drag-and-drop, file picker, template download, and result summary.

**Tech Stack:** NestJS + xlsx (SheetJS), React + Radix Dialog + React Query + axios FormData

---

### Task 1: Install `xlsx` dependency in backend

**Files:**
- Modify: `backend/package.json` (dependency add)
- Modify: `backend/package-lock.json` (auto-generated)

- [ ] **Step 1: Install xlsx**

Run:
```bash
cd backend && npm install xlsx
```

Expected: `xlsx` added to `dependencies` in `package.json`, lockfile updated.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "feat: add xlsx dependency for Excel import"
```

---

### Task 2: Create ImportMangaService with unit tests

**Files:**
- Create: `backend/src/modules/manga/services/import-manga.service.ts`
- Create: `backend/src/modules/manga/services/import-manga.service.spec.ts`
- Modify: `backend/src/modules/manga/manga.module.ts` (register ImportMangaService)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/manga/services/import-manga.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ImportMangaService } from './import-manga.service';
import { MangaService } from '../manga.service';
import { MangaStatus } from 'src/common/constants/manga.constant';

describe('ImportMangaService', () => {
  let service: ImportMangaService;
  let mangaService: jest.Mocked<MangaService>;

  const mockMangaService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportMangaService,
        { provide: MangaService, useValue: mockMangaService },
      ],
    }).compile();

    service = module.get(ImportMangaService);
    mangaService = module.get(MangaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- import-manga.service`
Expected: FAIL with "ImportMangaService not defined" (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation + test the parseCsvCell helper**

```typescript
// backend/src/modules/manga/services/import-manga.service.ts
import { Injectable } from '@nestjs/common';
import { MangaService } from '../manga.service';
import * as XLSX from 'xlsx';

export interface ImportResult {
  total: number;
  created: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ImportMangaService {
  constructor(private readonly mangaService: MangaService) {}

  parseCsvCell(value: string): string[] {
    if (!value || value.trim() === '') return [];
    const items: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of value) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        items.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    const last = current.trim();
    if (last) items.push(last);
    return items;
  }

  async import(file: Express.Multer.File): Promise<ImportResult> {
    const rows = this.parseExcel(file.buffer);
    const result: ImportResult = { total: rows.length, created: 0, errors: [] };

    for (const [i, row] of rows.entries()) {
      try {
        const dto = this.rowToCreateMangaDto(row);
        await this.mangaService.create(dto);
        result.created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }

  private parseExcel(buffer: Buffer): Record<string, string>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    return data;
  }

  private rowToCreateMangaDto(row: Record<string, string>) {
    const normalizeKey = (key: string) =>
      key.toLowerCase().replace(/\s+/g, '');

    const title = row[Object.keys(row).find((k) => normalizeKey(k) === 'title') ?? ''];
    const status = row[Object.keys(row).find((k) => normalizeKey(k) === 'status') ?? ''];
    const description = row[Object.keys(row).find((k) => normalizeKey(k) === 'description') ?? ''];
    const alternativeTitles = row[Object.keys(row).find((k) => normalizeKey(k) === 'alternativetitles') ?? ''];
    const coverPath = row[Object.keys(row).find((k) => normalizeKey(k) === 'coverpath') ?? ''];
    const authors = row[Object.keys(row).find((k) => normalizeKey(k) === 'authors') ?? ''];
    const genres = row[Object.keys(row).find((k) => normalizeKey(k) === 'genres') ?? ''];

    if (!title || !title.trim()) {
      throw new Error('Title is required');
    }
    if (!status || !['ongoing', 'completed', 'paused'].includes(status.trim().toLowerCase())) {
      throw new Error('Status is required and must be one of: ongoing, completed, paused');
    }

    return {
      title: title.trim(),
      status: status.trim().toLowerCase() as MangaStatus,
      description: description?.trim() || undefined,
      alternativeTitles: alternativeTitles ? this.parseCsvCell(alternativeTitles) : undefined,
      coverPath: coverPath?.trim() || undefined,
      authors: authors ? this.parseCsvCell(authors) : undefined,
      genres: genres ? this.parseCsvCell(genres) : undefined,
    };
  }
}
```

- [ ] **Step 4: Add comprehensive tests**

```typescript
// In the same test file, add these tests before the "should be defined" test:
describe('parseCsvCell', () => {
  it('should split comma-separated values', () => {
    const result = service.parseCsvCell('Action, Adventure, Fantasy');
    expect(result).toEqual(['Action', 'Adventure', 'Fantasy']);
  });

  it('should respect double-quoted commas', () => {
    const result = service.parseCsvCell('"Action, Adventure", Fantasy');
    expect(result).toEqual(['Action, Adventure', 'Fantasy']);
  });

  it('should return empty array for empty string', () => {
    const result = service.parseCsvCell('');
    expect(result).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    const result = service.parseCsvCell('   ');
    expect(result).toEqual([]);
  });

  it('should handle single value without commas', () => {
    const result = service.parseCsvCell('Action');
    expect(result).toEqual(['Action']);
  });

  it('should trim whitespace from each item', () => {
    const result = service.parseCsvCell('  Action ,  Adventure  ');
    expect(result).toEqual(['Action', 'Adventure']);
  });
});

describe('import', () => {
  it('should parse Excel buffer and create mangas', async () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: 'Manga A', Status: 'ongoing', Authors: 'Author1', Genres: 'Fantasy' },
      { Title: 'Manga B', Status: 'completed', Authors: 'Author2', Genres: 'Action' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    mockMangaService.create.mockResolvedValue({ id: 1 } as any);

    const file = { buffer, mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as Express.Multer.File;
    const result = await service.import(file);

    expect(result.total).toBe(2);
    expect(result.created).toBe(2);
    expect(result.errors).toEqual([]);
    expect(mockMangaService.create).toHaveBeenCalledTimes(2);
  });

  it('should report per-row errors and continue processing', async () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: 'Manga A', Status: 'ongoing' },
      { Title: '', Status: 'ongoing' },
      { Title: 'Manga C', Status: 'ongoing' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    mockMangaService.create
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockRejectedValueOnce(new Error('Title is required'))
      .mockResolvedValueOnce({ id: 3 } as any);

    const file = { buffer } as Express.Multer.File;
    const result = await service.import(file);

    expect(result.total).toBe(3);
    expect(result.created).toBe(2);
    expect(result.errors).toEqual([
      { row: 2, message: 'Title is required' },
    ]);
    expect(mockMangaService.create).toHaveBeenCalledTimes(3);
  });

  it('should handle empty Excel file', async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const file = { buffer } as Express.Multer.File;
    const result = await service.import(file);

    expect(result.total).toBe(0);
    expect(result.created).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('should handle all rows failing', async () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: '', Status: 'ongoing' },
      { Title: '', Status: 'ongoing' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    mockMangaService.create.mockRejectedValue(new Error('Title is required'));

    const file = { buffer } as Express.Multer.File;
    const result = await service.import(file);

    expect(result.total).toBe(2);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(2);
  });

  it('should handle CSV-quoted multi-value cells', async () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: 'Manga', Status: 'ongoing', Genres: '"Action, Adventure", Fantasy' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    mockMangaService.create.mockImplementation(async (dto) => {
      expect(dto.genres).toEqual(['Action, Adventure', 'Fantasy']);
      return { id: 1 } as any;
    });

    const file = { buffer } as Express.Multer.File;
    const result = await service.import(file);

    expect(result.created).toBe(1);
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- import-manga.service`
Expected: All tests PASS.

- [ ] **Step 6: Register ImportMangaService in MangaModule**

```typescript
// backend/src/modules/manga/manga.module.ts
import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { AuthorModule } from 'src/modules/author/author.module';
import { GenreModule } from 'src/modules/genre/genre.module';
import { ImportMangaService } from './services/import-manga.service'; // ADD

@Module({
  imports: [TypeOrmModule.forFeature([Manga]), AuthorModule, GenreModule],
  controllers: [MangaController],
  providers: [MangaService, MangaRepository, ImportMangaService], // ADD ImportMangaService
  exports: [MangaRepository],
})
export class MangaModule {}
```

- [ ] **Step 7: Run existing tests to make sure nothing is broken**

Run: `cd backend && npm test`
Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/manga/services/import-manga.service.ts backend/src/modules/manga/services/import-manga.service.spec.ts backend/src/modules/manga/manga.module.ts
git commit -m "feat: add ImportMangaService with Excel parsing and per-row error handling"
```

---

### Task 3: Add import endpoint to MangaController

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Modify: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Write the failing controller test**

Add these imports at the top of `manga.controller.spec.ts`:
```typescript
import { ImportMangaService } from './services/import-manga.service';
```

Update the `beforeEach` providers to add `ImportMangaService` mock:
```typescript
providers: [
  {
    provide: MangaService,
    useValue: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
  {
    provide: ImportMangaService,
    useValue: {
      import: jest.fn(),
    },
  },
],
```

Add a new variable after `let service`:
```typescript
let importService: jest.Mocked<ImportMangaService>;
```

Get it in `beforeEach`:
```typescript
importService = module.get(ImportMangaService);
```

Add these tests inside the main describe:
```typescript
describe('import', () => {
  it('should call ImportMangaService.import with the uploaded file', async () => {
    const mockFile = { buffer: Buffer.from('fake'), mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as Express.Multer.File;
    const importResult = { total: 2, created: 2, errors: [] };
    importService.import.mockResolvedValue(importResult);

    const result = await controller.import(mockFile);

    expect(importService.import).toHaveBeenCalledWith(mockFile);
    expect(result).toEqual(importResult);
  });

  it('should return 400 when no file provided', async () => {
    await expect(controller.import(undefined as any)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- manga.controller`
Expected: FAIL with "import does not exist on MangaController".

- [ ] **Step 3: Add import endpoint to controller**

```typescript
// backend/src/modules/manga/manga.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MangaService } from './manga.service';
import { ImportMangaService } from './services/import-manga.service';
import type { ImportResult } from './services/import-manga.service';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';

@Controller('mangas')
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly importMangaService: ImportMangaService, // ADD
  ) {}

  // ... existing methods ...

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importMangaService.import(file);
  }
}
```

- [ ] **Step 4: Update the mock in the controller test**

The mock setup needs to include `importMangaService`. Change the providers section:

```typescript
providers: [
  {
    provide: MangaService,
    useValue: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      import: jest.fn(),
    },
  },
  {
    provide: ImportMangaService,
    useValue: {
      import: jest.fn(),
    },
  },
],
```

And add the import to the test file:
```typescript
import { ImportMangaService } from './services/import-manga.service';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- manga.controller`
Expected: All tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `cd backend && npm test`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat: add POST /mangas/import endpoint with file upload"
```

---

### Task 4: Add template download endpoint

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Modify: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Add template endpoint to MangaController**

Add the method to `MangaController`:
```typescript
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Get('import/template')
async downloadTemplate(@Res() res: Response) {
  const workbook = XLSX.utils.book_new();
  const headerRow = [{
    Title: '',
    Status: '',
    Description: '',
    'Alternative Titles': '',
    'Cover Path': '',
    Authors: '',
    Genres: '',
  }];
  const sheet = XLSX.utils.json_to_sheet(headerRow);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="manga-import-template.xlsx"');
  res.send(buffer);
}
```

- [ ] **Step 2: Run tests to verify nothing is broken**

Run: `cd backend && npm test`
Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts
git commit -m "feat: add GET /mangas/import/template endpoint"
```

---

### Task 5: Add E2E test for import

**Files:**
- Modify: `backend/test/manga.e2e-spec.ts`

- [ ] **Step 1: Write the E2E test**

Add to the `manga.e2e-spec.ts` describe block:

```typescript
describe('POST /mangas/import', () => {
  it('should import mangas from xlsx file', async () => {
    // Build a minimal xlsx buffer
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: 'Imported Manga 1', Status: 'ongoing', Authors: 'Author A', Genres: 'Fantasy' },
      { Title: 'Imported Manga 2', Status: 'completed', Authors: 'Author B', Genres: 'Action' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app.getHttpServer())
      .post('/mangas/import')
      .attach('file', buffer, 'test.xlsx')
      .expect(201);

    expect(res.body.total).toBe(2);
    expect(res.body.created).toBe(2);
    expect(res.body.errors).toEqual([]);

    // Verify mangas were actually created
    const listRes = await request(app.getHttpServer()).get('/mangas').expect(200);
    const titles = listRes.body.data.map((m: any) => m.title);
    expect(titles).toContain('Imported Manga 1');
    expect(titles).toContain('Imported Manga 2');
  });

  it('should return partial success with errors', async () => {
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    const data = [
      { Title: 'Valid Manga', Status: 'ongoing' },
      { Title: '', Status: 'ongoing' },
      { Title: 'Another Valid', Status: 'completed' },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app.getHttpServer())
      .post('/mangas/import')
      .attach('file', buffer, 'test.xlsx')
      .expect(201);

    expect(res.body.total).toBe(3);
    expect(res.body.created).toBe(2);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].row).toBe(2);
  });

  it('should return 400 when no file provided', async () => {
    await request(app.getHttpServer())
      .post('/mangas/import')
      .expect(400);
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `cd backend && npm run test:e2e`
Expected: All E2E tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/test/manga.e2e-spec.ts
git commit -m "test: add E2E tests for manga import endpoint"
```

---

### Task 6: Add importMangas API function and useImportMangas hook

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`
- Create: `frontend/src/hooks/useImportMangas.ts`

- [ ] **Step 1: Add ImportResult type and importMangas API function**

Add to `frontend/src/services/api/mangaApi.ts`:

```typescript
export interface ImportResult {
  total: number
  created: number
  errors: Array<{ row: number; message: string }>
}

export async function importMangas(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axiosInstance.post<ImportResult>('/mangas/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
```

- [ ] **Step 2: Create the useImportMangas hook**

```typescript
// frontend/src/hooks/useImportMangas.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importMangas } from '#/services/api/mangaApi'
import type { ImportResult } from '#/services/api/mangaApi'

export function useImportMangas() {
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => importMangas(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas'] })
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/mangaApi.ts frontend/src/hooks/useImportMangas.ts
git commit -m "feat: add importMangas API and useImportMangas hook"
```

---

### Task 7: Create ImportDialog component

**Files:**
- Create: `frontend/src/components/manga/ImportDialog.tsx`

- [ ] **Step 1: Write the ImportDialog component**

```tsx
// frontend/src/components/manga/ImportDialog.tsx
import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle } from 'lucide-react'
import { useImportMangas } from '#/hooks/useImportMangas'
import type { ImportResult } from '#/services/api/mangaApi'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const handleDownloadTemplate = () => {
  const a = document.createElement('a')
  a.href = `${import.meta.env.VITE_API_URL}/mangas/import/template`
  a.download = 'manga-import-template.xlsx'
  a.click()
}

export default function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate, isPending } = useImportMangas()

  const reset = () => {
    setFile(null)
    setResult(null)
    setDragOver(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setResult(null)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setResult(null)
    }
  }

  const handleImport = () => {
    if (!file) return
    mutate(file, {
      onSuccess: (data) => setResult(data),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Mangas from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx file with manga rows to bulk create entries.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{result.created} manga created successfully</span>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-600">Errors:</p>
                {result.errors.map((err) => (
                  <div key={err.row} className="flex items-start gap-2 text-sm text-red-500">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Row {err.row}: {err.message}</span>
                  </div>
                ))}
              </div>
            )}
            {result.total > 0 && (
              <p className="text-sm text-muted-foreground">
                Processed {result.total} row{result.total !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Download template
            </button>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-muted-foreground/25'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your .xlsx file here, or click to browse
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleFileSelect}
              />
              {!file && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse Files
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter showCloseButton>
          {!result && (
            <Button onClick={handleImport} disabled={!file || isPending}>
              {isPending ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run frontend lint to verify**

Run: `cd frontend && npm run lint`
Expected: No errors (or fix any minor lint issues).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/manga/ImportDialog.tsx
git commit -m "feat: add ImportDialog component with drag-and-drop and result display"
```

---

### Task 8: Add import button to admin manga list page

**Files:**
- Modify: `frontend/src/routes/admin/mangas/index.tsx`

- [ ] **Step 1: Add ImportDialog and button to the manga list page**

Add imports at the top:
```tsx
import { useState } from 'react'
import { Upload } from 'lucide-react'
import ImportDialog from '#/components/manga/ImportDialog'
```

Replace the create button section (lines 136-142) to include the import button:
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={() => setImportOpen(true)}>
    <Upload className="h-4 w-4" />
    Import Excel
  </Button>
  <Button asChild>
    <Link to="/admin/mangas/new" className="no-underline">
      <Plus className="h-4 w-4" />
      Create New
    </Link>
  </Button>
</div>
```

Add state and dialog at the top of the component function:
```tsx
function MangaListPage() {
  const [importOpen, setImportOpen] = useState(false)
  // ... rest of existing code ...
```

And add the ImportDialog before the closing `</div>`:
```tsx
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
```

- [ ] **Step 2: Run frontend lint to verify**

Run: `cd frontend && npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/admin/mangas/index.tsx
git commit -m "feat: add Import Excel button to manga admin list page"
```
