import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
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
import { MangaService } from './services/manga.service';
import {
  ImportMangaService,
  ImportResult,
} from './services/import-manga.service';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';
import { ChapterService } from './services/chapter.service';
import { TranslationService } from './services/translation.service';
import { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';
import { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto';

@Controller('mangas')
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly importMangaService: ImportMangaService,
    private readonly chapterService: ChapterService,
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  create(@Body() dto: CreateMangaDto) {
    return this.mangaService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.mangaService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      status,
    );
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
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="manga-import-template.xlsx"',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('include') include?: string) {
    return this.mangaService.findOne(+id, include);
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

  @Patch(':mangaId/chapter/:chapterId/translations/:translationId')
  updateTranslation(
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('translationId', ParseIntPipe) translationId: number,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.translationService.update(
      mangaId,
      chapterId,
      translationId,
      dto,
    );
  }

  @Get('translations/:translationId')
  getTranslation(@Param('translationId', ParseIntPipe) translationId: number) {
    return this.translationService.findOne(translationId);
  }

  @Delete(':mangaId/chapter/:chapterId/translations/:translationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTranslation(
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('translationId', ParseIntPipe) translationId: number,
  ) {
    return this.translationService.delete(mangaId, chapterId, translationId);
  }
}
