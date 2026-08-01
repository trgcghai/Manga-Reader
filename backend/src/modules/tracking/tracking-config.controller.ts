import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';

@ApiTags('Tracking Config')
@Controller('tracking-config')
export class TrackingConfigController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get tracking config' })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  getConfig(): Promise<TrackingConfigResponseDto> {
    return this.trackingService.getConfig();
  }
}
