import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateChapterDto {
  @IsNumber()
  @Min(0)
  number: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsNumber()
  languageId: number;

  @IsNumber()
  translatorId: number;

  @IsString()
  @MinLength(1)
  url: string;
}
