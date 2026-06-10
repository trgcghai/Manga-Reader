import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MangaService } from './manga.service';

@Controller('mangas')
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Post()
  create() {
    return this.mangaService.create();
  }

  @Get()
  findAll() {
    return this.mangaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mangaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.mangaService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mangaService.remove(+id);
  }
}
