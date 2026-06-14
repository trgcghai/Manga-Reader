import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTranslatorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateTranslatorDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
