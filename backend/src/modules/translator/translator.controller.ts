import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TranslatorService } from './translator.service';

@Controller('translator')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) {}

  @Post()
  create() {
    return this.translatorService.create();
  }

  @Get()
  findAll() {
    return this.translatorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.translatorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.translatorService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.translatorService.remove(+id);
  }
}
