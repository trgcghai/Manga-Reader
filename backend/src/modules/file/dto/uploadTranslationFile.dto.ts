import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadTranslationFileDto {
  @IsNumber()
  @Type(() => Number)
  mangaId: number;

  @IsNumber()
  @Type(() => Number)
  chapterNumber: number;
}
