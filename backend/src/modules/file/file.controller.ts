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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ALLOWED_MIME_TYPES } from '../../common/constants/chapter.constant';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
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
    return this.fileService.upload('uploads', file.buffer, file.mimetype);
  }

  @Delete(':key*')
  async delete(@Param('key') key: string) {
    await this.fileService.delete(key);
  }
}
