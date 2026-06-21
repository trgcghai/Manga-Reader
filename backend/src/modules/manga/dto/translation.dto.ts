import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTranslationDto {
  @IsOptional()
  @IsNumber()
  languageId?: number;

  @IsOptional()
  @IsNumber()
  translatorId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  url?: string;
}

export class TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
  prevTranslationId: number | null;
  nextTranslationId: number | null;
}
