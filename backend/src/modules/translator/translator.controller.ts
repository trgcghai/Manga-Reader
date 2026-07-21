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
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Translators')
@Controller('translators')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a translator' })
  create(@Body() dto: CreateTranslatorDto) {
    return this.translatorService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all translators' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
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
  @ApiOperation({ summary: 'Get a translator by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id') id: string) {
    return this.translatorService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a translator' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id') id: string, @Body() dto: UpdateTranslatorDto) {
    return this.translatorService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a translator' })
  @ApiParam({ name: 'id', type: Number })
  delete(@Param('id') id: string) {
    return this.translatorService.delete(+id);
  }
}
