import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateTrackingSourceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  mangaId: number;

  @ApiProperty({ example: 'https://example.com/manga/one-piece' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'MangaDex' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'data.chapters[0].number',
    description: 'Dot-notation JSON path to the latest chapter number',
  })
  @IsOptional()
  @IsString()
  extractorPath?: string;
}

export class UpdateTrackingSourceDto {
  @ApiPropertyOptional({ example: 'https://example.com/manga/one-piece' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'MangaDex' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'data.chapters[0].number',
    description: 'Dot-notation JSON path to the latest chapter number',
  })
  @IsOptional()
  @IsString()
  extractorPath?: string;
}

export class TrackingSourceResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  mangaId: number;

  @ApiProperty()
  url: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  latestChapterNumber: string | null;

  @ApiPropertyOptional()
  extractorPath: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({
    example: { id: 1, title: 'One Piece' },
  })
  manga: { id: number; title: string };
}
