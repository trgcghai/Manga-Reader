import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { TranslatorService } from './translator.service';
import {
  CreateTranslatorDto,
  UpdateTranslatorDto,
} from 'src/modules/translator/dto/translator.dto';

@Controller('translators')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) {}

  @Post()
  create(@Body() dto: CreateTranslatorDto) {
    return this.translatorService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.translatorService.findAll(
      search,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.translatorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTranslatorDto) {
    return this.translatorService.update(+id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.translatorService.delete(+id);
  }
}
