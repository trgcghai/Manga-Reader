import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import {
  CreateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';

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
  async create(
    @Body() dto: CreateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> {
    return this.trackingService.createSource(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tracking sources' })
  @ApiQuery({ name: 'mangaId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  findAll(
    @Query('mangaId') mangaId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.trackingService.findAllSources(
      mangaId ? parseInt(mangaId, 10) : undefined,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
