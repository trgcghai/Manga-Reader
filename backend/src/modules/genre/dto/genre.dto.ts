import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGenreDto {
  @ApiProperty({ example: 'Action' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateGenreDto {
  @ApiPropertyOptional({ example: 'Action' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
