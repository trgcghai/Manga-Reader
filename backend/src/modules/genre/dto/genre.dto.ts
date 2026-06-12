import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGenreDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateGenreDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
