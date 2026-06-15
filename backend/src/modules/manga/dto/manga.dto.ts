import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';

export class AuthorRef {
  id: number;
  name: string;
}

export class GenreRef {
  id: number;
  name: string;
}

export class MangaResponse {
  id: number;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverPath?: string;
  status: string;
  authors: AuthorRef[];
  genres: GenreRef[];
  createdAt: string;
  updatedAt: string;
}

export class ChapterTranslationResponse {
  id: number;
  folderPath: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
}

export class ChapterDetailResponse {
  id: number;
  number: number;
  title?: string;
  releaseDate?: string;
  note?: string;
  translations: ChapterTranslationResponse[];
}

export class MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetailResponse[];
}

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
