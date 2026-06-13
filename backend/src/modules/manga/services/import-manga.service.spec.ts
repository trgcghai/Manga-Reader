import { Test, TestingModule } from '@nestjs/testing';
import { ImportMangaService } from './import-manga.service';
import { MangaService } from '../manga.service';

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
      const XLSX = require('xlsx');
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
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      const data = [
        { Title: 'Manga A', Status: 'ongoing' },
        { Title: 'Manga B', Status: 'ongoing' },
        { Title: 'Manga C', Status: 'ongoing' },
      ];
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      mockMangaService.create
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ id: 3 } as any);

      const file = { buffer } as Express.Multer.File;
      const result = await service.import(file);

      expect(result.total).toBe(3);
      expect(result.created).toBe(2);
      expect(result.errors).toEqual([
        { row: 2, message: 'Database error' },
      ]);
      expect(mockMangaService.create).toHaveBeenCalledTimes(3);
    });

    it('should handle empty Excel file', async () => {
      const XLSX = require('xlsx');
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
      const XLSX = require('xlsx');
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
      const XLSX = require('xlsx');
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
});
