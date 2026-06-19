import {
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

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'cbz',
};

function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // ZIP — PK\x03\x04
  if (
    buffer[0] === 0x50 && buffer[1] === 0x4B &&
    buffer[2] === 0x03 && buffer[3] === 0x04
  ) {
    return 'application/zip';
  }
  // JPEG — \xFF\xD8\xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG — \x89PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  // WebP — RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 &&
    buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

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
    this.endpoint = configService
      .get<string>('MINIO_ENDPOINT', '')
      .replace(/\/+$/, '');
  }

  async upload(
    prefix: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ key: string; url: string }> {
    const effectiveMime = EXT_MAP[mimetype] ? mimetype : (detectMimeFromBuffer(buffer) || mimetype);
    const ext = EXT_MAP[effectiveMime] || 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(
        this.bucket,
        key,
        buffer,
        buffer.length,
        {
          'Content-Type': effectiveMime,
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

  async download(key: string): Promise<StreamableFile> {
    try {
      const stream = await this.minioClient.getObject(this.bucket, key);
      const contentType = getContentType(key);
      return new StreamableFile(stream, { type: contentType });
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
