import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
} from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';

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
