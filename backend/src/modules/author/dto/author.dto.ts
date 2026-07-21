import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthorDto {
  @ApiProperty({ example: 'Eiichiro Oda' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateAuthorDto {
  @ApiPropertyOptional({ example: 'Eiichiro Oda' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
