import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { TrackingFrequency } from '../constants/tracking.constant';

export class UpdateTrackingConfigDto {
  @ApiPropertyOptional({ enum: TrackingFrequency, example: TrackingFrequency.DAILY })
  @IsOptional()
  @IsEnum(TrackingFrequency)
  frequency?: TrackingFrequency;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ example: '02:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'runAt must be in HH:mm format' })
  runAt?: string;
}

export class TrackingConfigResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: TrackingFrequency })
  frequency: TrackingFrequency;

  @ApiProperty()
  interval: number;

  @ApiProperty()
  runAt: string;

  @ApiProperty()
  updatedAt: string;
}
