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
import { ALLOWED_MIME_TYPES } from 'src/common/constants/chapter.constant';
import { TRANSLATION_ALLOWED_MIME_TYPES } from 'src/common/constants/translation.constant';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TRANSLATION_FILE_SIZE = 100 * 1024 * 1024;

@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  @Post('upload/cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({
            fileType: new RegExp(`^(${ALLOWED_MIME_TYPES.join('|')})$`),
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
  async uploadTranslation(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_TRANSLATION_FILE_SIZE }),
          new FileTypeValidator({
            fileType: new RegExp(
              `^(${TRANSLATION_ALLOWED_MIME_TYPES.join('|')})$`,
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

    const filename = key.split('/').pop() || 'download';
    const file = await this.fileService.download(key);

    return new StreamableFile(file.getStream(), {
      type: file.getHeaders()['content-type'],
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Delete('*key')
  async delete(@Param('key') key: string) {
    await this.fileService.delete(key);
  }
}
