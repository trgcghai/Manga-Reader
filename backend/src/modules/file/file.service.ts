import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  paginateListObjectsV2,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  STORAGE_CLIENT,
  EXT_MAP,
  ALLOWED_TRANSLATION_EXTENSIONS,
} from 'src/common/constants/file.constant';
import { getContentType } from 'src/common/utils/file-mime.util';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  readonly bucket: string;
  readonly publicUrl: string;

  constructor(
    @Inject(STORAGE_CLIENT) private readonly storageClient: S3Client,
    configService: ConfigService,
  ) {
    const bucket = configService.get<string>('STORAGE_BUCKET');
    const publicUrl = configService.get<string>('STORAGE_PUBLIC_URL');
    if (!bucket) {
      throw new Error('STORAGE_BUCKET environment variable is required');
    }
    if (!publicUrl) {
      throw new Error('STORAGE_PUBLIC_URL environment variable is required');
    }
    try {
      new URL(publicUrl);
    } catch {
      throw new Error('STORAGE_PUBLIC_URL must be a valid URL');
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/+$/, '');
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
      await this.storageClient.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
      return { key, url: this.getPublicObjectUrl(key) };
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

    if (ext && ALLOWED_TRANSLATION_EXTENSIONS.includes(ext)) {
      return this.upload(prefix, file.buffer, 'application/zip');
    } else {
      throw new BadRequestException(
        `Invalid translation file type. Only ${ALLOWED_TRANSLATION_EXTENSIONS.join(', ')} files are allowed.`,
      );
    }
  }

  async download(key: string): Promise<StreamableFile> {
    try {
      const response = await this.storageClient.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!(response.Body instanceof Readable)) {
        throw new Error('Storage response did not contain a readable body');
      }

      const contentType = getContentType(key);
      const filename = key.split('/').pop() || 'download';
      return new StreamableFile(response.Body, {
        type: contentType,
        disposition: `attachment; filename="${filename}"`,
      });
    } catch (error: unknown) {
      if (this.isMissingObject(error)) {
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
      await this.storageClient.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error: unknown) {
      this.logger.error(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('File delete failed');
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const paginator = paginateListObjectsV2(
        { client: this.storageClient },
        { Bucket: this.bucket, Prefix: prefix || '' },
      );
      const keys: string[] = [];
      for await (const page of paginator) {
        for (const item of page.Contents || []) {
          if (item.Key) {
            keys.push(item.Key);
          }
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

  async checkStorageAccess(): Promise<void> {
    await this.storageClient.send(
      new HeadBucketCommand({ Bucket: this.bucket }),
    );
  }

  private getPublicObjectUrl(key: string): string {
    const bucket = encodeURIComponent(this.bucket);
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${this.publicUrl}/${bucket}/${encodedKey}`;
  }

  private isMissingObject(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const sdkError = error as {
      name?: string;
      code?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      sdkError.name === 'NoSuchKey' ||
      sdkError.name === 'NotFound' ||
      sdkError.code === 'NoSuchKey' ||
      sdkError.Code === 'NoSuchKey' ||
      sdkError.$metadata?.httpStatusCode === 404
    );
  }
}
