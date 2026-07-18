import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CLIENT } from './file.constants';
import { randomUUID } from 'node:crypto';
import { getContentType } from 'src/common/utils/file-mime.util';
import { TRANSLATION_EXTENSIONS } from 'src/common/constants/translation.constant';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'zip',
  'application/vnd.comicbook+zip': 'cbz',
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  readonly bucket: string;
  readonly endpoint: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.get<string>('MINIO_BUCKET')!;
    this.endpoint = 'http://localhost:9000';
  }

  async upload(
    prefix: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ key: string; url: string }> {
    if (!EXT_MAP[mimetype]) {
      this.logger.warn(
        `Unrecognized mimetype "${mimetype}", falling back to .bin`,
      );
    }
    const ext = EXT_MAP[mimetype] || 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(
        this.bucket,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': mimetype,
        },
      );
      return { key, url: `${this.endpoint}/${this.bucket}/${key}` };
    } catch (error: unknown) {
      this.logger.error(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async uploadTranslation(
    prefix: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop();

    if (ext && TRANSLATION_EXTENSIONS.includes(ext)) {
      switch (ext) {
        case 'cbz':
          return this.upload(
            prefix,
            file.buffer,
            'application/vnd.comicbook+zip',
          );
        case 'zip':
          return this.upload(prefix, file.buffer, 'application/zip');
        default:
          return this.upload(prefix, file.buffer, file.mimetype);
      }
    } else {
      throw new BadRequestException(
        `Invalid translation file type. Only ${TRANSLATION_EXTENSIONS.join(', ')} files are allowed.`,
      );
    }
  }

  async download(key: string): Promise<StreamableFile> {
    try {
      const stream = await this.minioClient.getObject(this.bucket, key);
      const contentType = getContentType(key);
      const filename = key.split('/').pop() || 'download';
      return new StreamableFile(stream, {
        type: contentType,
        disposition: `attachment; filename="${filename}"`,
      });
    } catch (error: unknown) {
      const minioError = error as { code?: string };
      if (minioError.code === 'NoSuchKey' || minioError.code === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('File download failed');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
    } catch (error: unknown) {
      this.logger.error(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('File delete failed');
    }
  }

  /**
   * @param fileSize - Reserved for future upload size validation. Not yet enforced.
   */
  async generatePresignedUploadUrl(
    prefix: string,
    contentType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    const ext = EXT_MAP[contentType];
    if (!ext) {
      throw new BadRequestException(`Unsupported content type: ${contentType}`);
    }
    const key = `${prefix}/${randomUUID()}.${ext}`;
    const expiry = 3600;

    const uploadUrl = await this.minioClient.presignedPutObject(
      this.bucket,
      key,
      expiry,
    );

    return { uploadUrl, key, expiresIn: expiry };
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const stream = this.minioClient.listObjects(
        this.bucket,
        prefix || '',
        true,
      );
      const keys: string[] = [];
      for await (const obj of stream) {
        const item = obj as Minio.BucketItem;
        if (item.name) {
          keys.push(item.name);
        }
      }
      return keys;
    } catch (error: unknown) {
      this.logger.error(
        `List failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('File list failed');
    }
  }
}
