import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAuthorDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
