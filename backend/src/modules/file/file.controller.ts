import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Body,
  Logger,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { UploadTranslationFileDto } from './dto/uploadTranslationFile.dto';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_TRANSLATION_MIME_TYPES,
  MAX_COVER_FILE_SIZE,
  MAX_TRANSLATION_FILE_SIZE,
} from 'src/common/constants/file.constant';
import { PresignedUploadCoverDto } from './dto/presignedUploadCover.dto';
import { PresignedUploadTranslationDto } from './dto/presignedUploadTranslation.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  @Post('upload/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_COVER_FILE_SIZE }),
          new FileTypeValidator({
            fileType: new RegExp(`^(${ALLOWED_IMAGE_MIME_TYPES.join('|')})$`),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.fileService.upload('manga/cover', file.buffer, file.mimetype);
  }

  @Post('upload/translation')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a translation file (CBZ/ZIP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadTranslation(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_TRANSLATION_FILE_SIZE }),
          new FileTypeValidator({
            fileType: new RegExp(
              `^(${ALLOWED_TRANSLATION_MIME_TYPES.join('|')})$`,
            ),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadTranslationFileDto,
  ) {
    const prefix = `manga/${dto.mangaId}/chapter/${dto.chapterNumber}/translations`;

    return this.fileService.uploadTranslation(prefix, file);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download a file by MinIO URL' })
  @ApiQuery({ name: 'url', required: true, description: 'MinIO object URL' })
  async download(@Query('url') url: string): Promise<StreamableFile> {
    if (!url) {
      throw new BadRequestException('url query parameter is required');
    }

    const key = extractKeyFromUrl(
      url,
      this.fileService.endpoint,
      this.fileService.bucket,
    );

    if (!key) {
      throw new BadRequestException('Invalid Minio URL');
    }
    return await this.fileService.download(key);
  }

  @Delete('*key')
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiParam({ name: 'key', description: 'MinIO object key' })
  async delete(@Param('key') key: string) {
    await this.fileService.delete(key);
  }

  @Post('presigned-upload/cover')
  @ApiOperation({ summary: 'Get presigned upload URL for cover image' })
  @ApiBody({ type: PresignedUploadCoverDto })
  async presignedUploadCover(@Body() dto: PresignedUploadCoverDto) {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Unsupported cover content type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      );
    }
    if (dto.fileSize > MAX_COVER_FILE_SIZE) {
      throw new BadRequestException(
        `Cover file size must not exceed ${MAX_COVER_FILE_SIZE / (1024 * 1024)} MB`,
      );
    }
    return this.fileService.generatePresignedUploadUrl(
      'manga/cover',
      dto.contentType,
    );
  }

  @Post('presigned-upload/translation')
  @ApiOperation({ summary: 'Get presigned upload URL for translation file' })
  @ApiBody({ type: PresignedUploadTranslationDto })
  async presignedUploadTranslation(@Body() dto: PresignedUploadTranslationDto) {
    if (!ALLOWED_TRANSLATION_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Unsupported translation content type. Allowed: ${ALLOWED_TRANSLATION_MIME_TYPES.join(', ')}`,
      );
    }
    if (dto.fileSize > MAX_TRANSLATION_FILE_SIZE) {
      throw new BadRequestException(
        `Translation file size must not exceed ${MAX_TRANSLATION_FILE_SIZE / (1024 * 1024)} MB`,
      );
    }
    const prefix = `manga/${dto.mangaId}/chapter/${dto.chapterNumber}/translations`;
    return this.fileService.generatePresignedUploadUrl(prefix, dto.contentType);
  }
}
