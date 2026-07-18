import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadCoverDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 5 * 1024 * 1024 })
  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize: number;
}
