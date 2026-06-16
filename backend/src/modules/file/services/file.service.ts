import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CLIENT } from '../file.module';
import { randomUUID } from 'node:crypto';

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
}
