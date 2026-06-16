import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CLIENT } from '../file.module';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { getContentType } from './file-mime.util';

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.get<string>('MINIO_BUCKET')!;
    this.endpoint = configService.get<string>('MINIO_ENDPOINT', '').replace(/\/+$/, '');
  }

  async upload(prefix: string, buffer: Buffer, mimetype: string): Promise<string> {
    const ext = EXT_MAP[mimetype] || 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    try {
      await this.minioClient.putObject(this.bucket, key, buffer, {
        'Content-Type': mimetype,
      });
      return `${this.endpoint}/${this.bucket}/${key}`;
    } catch (error) {
      this.logger.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async download(key: string): Promise<StreamableFile> {
    try {
      const stream = await this.minioClient.getObject(this.bucket, key);
      const contentType = getContentType(key);
      return new StreamableFile(stream as Readable, { type: contentType });
    } catch (error: any) {
      if (error?.code === 'NoSuchKey' || error?.code === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      this.logger.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File download failed');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File delete failed');
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const stream = this.minioClient.listObjects(this.bucket, prefix || '', true);
      const keys: string[] = [];
      for await (const obj of stream) {
        keys.push(obj.name);
      }
      return keys;
    } catch (error) {
      this.logger.error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException('File list failed');
    }
  }
}
