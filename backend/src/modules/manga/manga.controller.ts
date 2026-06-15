import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  Header,
  HttpCode,
  HttpStatus,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { MangaService } from './manga.service';
import {
  ImportMangaService,
  ImportResult,
} from './services/import-manga.service';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';
import { ChapterService } from './services/chapter.service';
import { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';

@Controller('mangas')
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly importMangaService: ImportMangaService,
    private readonly chapterService: ChapterService,
  ) {}

  @Post()
  create(@Body() dto: CreateMangaDto) {
    return this.mangaService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.mangaService.findAll(parseInt(page), parseInt(limit));
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importMangaService.import(file);
  }

  @Get('import-template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="manga-import-template.xlsx"',
  )
  downloadTemplate(): StreamableFile {
    const workbook = XLSX.utils.book_new();
    const headerRow = [
      {
        Title: '',
        Status: '',
        Description: '',
        'Alternative Titles': '',
        'Cover Path': '',
        Authors: '',
        Genres: '',
      },
    ];
    const sheet = XLSX.utils.json_to_sheet(headerRow);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new StreamableFile(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mangaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMangaDto) {
    return this.mangaService.update(+id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mangaService.delete(+id);
  }

  @Post(':mangaId/chapter')
  @HttpCode(HttpStatus.CREATED)
  createChapter(
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chapterService.create(mangaId, dto);
  }
}
