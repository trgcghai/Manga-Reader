import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { UploadTranslationFileDto } from './dto/uploadTranslationFile.dto';
import { ALLOWED_MIME_TYPES } from 'src/common/constants/chapter.constant';
import { TRANSLATION_ALLOWED_MIME_TYPES } from 'src/common/constants/translation.constant';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TRANSLATION_FILE_SIZE = 100 * 1024 * 1024;

@Controller('files')
export class FileController {
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
    return this.fileService.upload(prefix, file.buffer, file.mimetype);
  }

  @Delete('*key')
  async delete(@Param('key') key: string) {
    await this.fileService.delete(key);
  }
}
