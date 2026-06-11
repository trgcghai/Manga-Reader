import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MangaService } from './manga.service';
import { CreateMangaDto } from 'src/modules/manga/dto/manga.dto';

@Controller('mangas')
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

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
}
