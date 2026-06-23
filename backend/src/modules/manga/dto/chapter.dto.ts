import {
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChapterDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  number: number;

  @ApiProperty({ example: 'Chapter 1' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  languageId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  translatorId: number;

  @ApiProperty({
    example: 'http://minio/manga/1/chapter/1/translations/uuid.zip',
  })
  @IsString()
  @MinLength(1)
  url: string;
}

export class ImportChapterRowDto {
  @ApiProperty({ example: '1' })
  @IsNumberString()
  Number: string;

  @ApiPropertyOptional({ example: 'Chapter 1' })
  @IsOptional()
  @IsString()
  Title?: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @MinLength(1)
  Language: string;

  @ApiProperty({ example: 'Scan Group A' })
  @IsString()
  @MinLength(1)
  Translator: string;

  @ApiProperty({ example: 'files/ch01/en.zip' })
  @IsString()
  @MinLength(1)
  File: string;
}
