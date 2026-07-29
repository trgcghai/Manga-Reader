import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { CreateTrackingSourceDto, TrackingSourceResponseDto } from './dto/tracking-source.dto';

@ApiTags('Tracking Sources')
@Controller('tracking-sources')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check tracking module health' })
  @ApiOkResponse({ description: 'Module is active' })
  getStatus(): { status: string; module: string; timestamp: string } {
    return this.trackingService.getStatus();
  }

  @Post()
  @ApiOperation({ summary: 'Create a tracking source' })
  @ApiCreatedResponse({ type: TrackingSourceResponseDto })
  async create(@Body() dto: CreateTrackingSourceDto): Promise<TrackingSourceResponseDto> {
    return this.trackingService.createSource(dto);
  }
}
