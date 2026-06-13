import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { MangaService } from './manga.service';
import { ImportMangaService, ImportResult } from './services/import-manga.service';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';

@Controller('mangas')
export class MangaController {
  constructor(
    private readonly mangaService: MangaService,
    private readonly importMangaService: ImportMangaService,
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

  @Get('import/template')
  async downloadTemplate(@Res({ passthrough: true }) res: Response) {
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
}
