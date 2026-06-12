import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateAuthorDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
