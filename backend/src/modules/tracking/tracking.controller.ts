import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Check tracking module health' })
  @ApiOkResponse({ description: 'Module is active' })
  getStatus(): { status: string; module: string; timestamp: string } {
    return this.trackingService.getStatus();
  }
}
