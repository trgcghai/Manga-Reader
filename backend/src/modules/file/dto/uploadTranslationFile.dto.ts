import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UploadTranslationFileDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  mangaId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  chapterNumber: number;
}
