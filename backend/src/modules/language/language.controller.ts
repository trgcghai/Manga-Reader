import { Controller, Get } from '@nestjs/common';
import { LanguageService } from './language.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Languages')
@Controller('language')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiOperation({ summary: 'List all languages' })
  findAll() {
    return this.languageService.findAll();
  }
}
