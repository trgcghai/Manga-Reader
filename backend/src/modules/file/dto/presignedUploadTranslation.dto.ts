import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadTranslationDto {
  @ApiProperty({ example: 'application/zip' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 50 * 1024 * 1024 })
  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024)
  fileSize: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  mangaId: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  chapterNumber: number;
}
