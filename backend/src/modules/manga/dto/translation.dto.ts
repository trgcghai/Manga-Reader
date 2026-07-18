import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTranslationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  languageId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  translatorId?: number;

  @ApiPropertyOptional({ example: 'manga/1/chapter/1/translations/new-uuid.zip' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  key?: string;
}

export class TranslationDetailResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  key: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({
    example: { id: 1, code: 'en', name: 'English' },
  })
  language: { id: number; code: string; name: string };

  @ApiProperty({
    example: { id: 1, name: 'Scan Group A' },
  })
  translator: { id: number; name: string };

  @ApiProperty({
    example: {
      id: 1,
      number: 1,
      title: 'Chapter 1',
      manga: { id: 1, title: 'One Piece' },
    },
  })
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };

  @ApiProperty({ example: null, nullable: true })
  prevTranslationId: number | null;

  @ApiProperty({ example: null, nullable: true })
  nextTranslationId: number | null;
}

export class ReaderChapterItem {
  @ApiProperty()
  chapterId: number;

  @ApiProperty()
  number: number;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty({ nullable: true })
  translationId: number | null;

  @ApiProperty()
  isFirstChapter: boolean;

  @ApiProperty()
  isLatestChapter: boolean;
}
