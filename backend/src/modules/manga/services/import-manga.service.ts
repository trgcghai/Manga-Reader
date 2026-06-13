import { Injectable } from '@nestjs/common';
import { MangaService } from '../manga.service';
import { MangaStatus } from 'src/common/constants/manga.constant';
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
    const validStatuses = Object.values(MangaStatus).map(v => v.toLowerCase());
    if (!status || !validStatuses.includes(status.trim().toLowerCase())) {
      throw new Error(`Status is required and must be one of: ${validStatuses.join(', ')}`);
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
