import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';

export class CreateMangaDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsEnum(MangaStatus)
  status: MangaStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  alternativeTitles?: string[];

  @IsOptional()
  @IsString()
  coverPath?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  genres?: string[];
}

export class UpdateMangaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeTitles?: string[];

  @IsOptional()
  @IsString()
  coverPath?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];
}
