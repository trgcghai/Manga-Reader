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
}
