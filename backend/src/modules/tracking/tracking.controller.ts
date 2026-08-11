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
  ApiNotFoundResponse,
  ApiBadGatewayResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  TrackingService,
  CheckResult,
  AggregateCheckResult,
} from './tracking.service';
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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  findAll(
    @Query('mangaId') mangaId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.trackingService.findAllSources(
      mangaId ? parseInt(mangaId, 10) : undefined,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
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

  @Post('check-all')
  @ApiOperation({ summary: 'Check all tracking sources' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          sourceId: 1,
          sourceName: 'MangaDex',
          url: 'https://example.com/manga/one-piece',
          updated: true,
          previous: '100',
          current: '101',
        },
      ],
    },
  })
  async checkAll(): Promise<AggregateCheckResult[]> {
    return this.trackingService.checkAllSources();
  }

  @Post('check-manga/:mangaId')
  @ApiOperation({ summary: 'Check all sources of a manga' })
  @ApiParam({ name: 'mangaId', type: Number })
  @ApiOkResponse({
    schema: {
      example: [
        {
          sourceId: 1,
          sourceName: 'MangaDex',
          url: 'https://example.com/manga/one-piece',
          updated: false,
          error:
            'Source URL is unreachable: https://example.com/manga/one-piece',
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Manga not found' })
  async checkManga(
    @Param('mangaId') mangaId: string,
  ): Promise<AggregateCheckResult[]> {
    return this.trackingService.checkMangaSources(parseInt(mangaId, 10));
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Check a single tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    schema: {
      example: { updated: true, previous: '100', current: '101', mangaId: 1 },
    },
  })
  @ApiNotFoundResponse({ description: 'Tracking source not found' })
  @ApiBadGatewayResponse({ description: 'Source URL is unreachable' })
  @ApiUnprocessableEntityResponse({ description: 'Response parsing failed' })
  async checkSource(@Param('id') id: string): Promise<CheckResult> {
    return this.trackingService.checkSource(parseInt(id, 10));
  }

  @Get('config')
  @ApiOperation({ summary: 'Get tracking config' })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  getConfig(): Promise<TrackingConfigResponseDto> {
    return this.trackingService.getConfig();
  }
}
