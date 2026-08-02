import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';

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

  @Patch('config')
  @ApiOperation({ summary: 'Update tracking config' })
  @ApiBody({ type: UpdateTrackingConfigDto })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  async updateConfig(
    @Body() dto: UpdateTrackingConfigDto,
  ): Promise<TrackingConfigResponseDto> {
    return this.trackingService.updateConfig(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TrackingSourceResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> {
    return this.trackingService.updateSource(parseInt(id, 10), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Tracking source deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.trackingService.deleteSource(parseInt(id, 10));
  }

  @Get('config')
  @ApiOperation({ summary: 'Get tracking config' })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  getConfig(): Promise<TrackingConfigResponseDto> {
    return this.trackingService.getConfig();
  }
}
