import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChapterDto {
  @IsNumber()
  @Min(0)
  number: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNumber()
  languageId: number;

  @IsNumber()
  translatorId: number;

  @IsString()
  @MinLength(1)
  folderPath: string;
}
