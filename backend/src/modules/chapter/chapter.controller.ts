import { Controller, Get, Query } from '@nestjs/common';
import { ChapterService } from './chapter.service';

@Controller('chapter')
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  @Get('/scan')
  testScanning(@Query('path') path: string) {
    return this.chapterService.scanImages(path);
  }
}
