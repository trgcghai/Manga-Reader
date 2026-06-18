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
