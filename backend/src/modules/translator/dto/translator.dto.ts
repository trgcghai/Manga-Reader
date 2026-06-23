import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTranslatorDto {
  @ApiProperty({ example: 'Scan Group A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Known for high-quality scans' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateTranslatorDto {
  @ApiPropertyOptional({ example: 'Scan Group A' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Known for high-quality scans' })
  @IsString()
  @IsOptional()
  note?: string;
}
