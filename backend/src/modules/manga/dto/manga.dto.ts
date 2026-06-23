import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorRef {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class GenreRef {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class MangaResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  alternativeTitles?: string[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  coverPath?: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: AuthorRef, isArray: true })
  authors: AuthorRef[];

  @ApiProperty({ type: GenreRef, isArray: true })
  genres: GenreRef[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ChapterTranslationResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ example: { id: 1, code: 'en', name: 'English' } })
  language: { id: number; code: string; name: string };

  @ApiProperty({ example: { id: 1, name: 'Scan Group A' } })
  translator: { id: number; name: string };
}

export class ChapterDetailResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  number: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  releaseDate?: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ type: ChapterTranslationResponse, isArray: true })
  translations: ChapterTranslationResponse[];
}

export class MangaDetailResponse extends MangaResponse {
  @ApiProperty({ type: ChapterDetailResponse, isArray: true })
  chapters: ChapterDetailResponse[];
}

export class CreateMangaDto {
  @ApiProperty({ example: 'One Piece' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ enum: MangaStatus, example: 'ongoing' })
  @IsEnum(MangaStatus)
  status: MangaStatus;

  @ApiPropertyOptional({ example: 'A pirate adventure story' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['One Piece', 'ワンピース'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  alternativeTitles?: string[];

  @ApiPropertyOptional({ example: 'covers/one-piece.jpg' })
  @IsOptional()
  @IsString()
  coverPath?: string;

  @ApiPropertyOptional({ example: ['Eiichiro Oda'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  authors?: string[];

  @ApiPropertyOptional({ example: ['Action', 'Adventure'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  genres?: string[];
}

export class UpdateMangaDto {
  @ApiPropertyOptional({ example: 'One Piece' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ enum: MangaStatus, example: 'ongoing' })
  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @ApiPropertyOptional({ example: 'A pirate adventure story' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['One Piece', 'ワンピース'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeTitles?: string[];

  @ApiPropertyOptional({ example: 'covers/one-piece.jpg' })
  @IsOptional()
  @IsString()
  coverPath?: string;

  @ApiPropertyOptional({ example: ['Eiichiro Oda'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @ApiPropertyOptional({ example: ['Action', 'Adventure'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];
}
