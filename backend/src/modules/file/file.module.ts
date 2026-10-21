import { Global, Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { S3Client } from '@aws-sdk/client-s3';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import {
  MINIO_CLIENT,
  STORAGE_CLIENT,
} from 'src/common/constants/file.constant';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [
    {
      provide: STORAGE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('STORAGE_ENDPOINT');
        const region = configService.get<string>('STORAGE_REGION');
        const accessKey = configService.get<string>('STORAGE_ACCESS_KEY');
        const secretKey = configService.get<string>('STORAGE_SECRET_KEY');
        const bucket = configService.get<string>('STORAGE_BUCKET');

        if (!region)
          throw new Error('STORAGE_REGION environment variable is required');
        if (!accessKey)
          throw new Error(
            'STORAGE_ACCESS_KEY environment variable is required',
          );
        if (!secretKey)
          throw new Error(
            'STORAGE_SECRET_KEY environment variable is required',
          );
        if (!bucket)
          throw new Error('STORAGE_BUCKET environment variable is required');

        return new S3Client({
          region,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          ...(endpoint
            ? { endpoint, forcePathStyle: true }
            : {}),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT');
        const accessKey = configService.get<string>('MINIO_ACCESS_KEY');
        const secretKey = configService.get<string>('MINIO_SECRET_KEY');

        if (!endpoint)
          throw new Error('MINIO_ENDPOINT environment variable is required');
        if (!accessKey)
          throw new Error('MINIO_ACCESS_KEY environment variable is required');
        if (!secretKey)
          throw new Error('MINIO_SECRET_KEY environment variable is required');

        const url = new URL(endpoint);
        return new Minio.Client({
          endPoint: url.hostname,
          port: Number(url.port) || 9000,
          useSSL: url.protocol === 'https:',
          accessKey,
          secretKey,
        });
      },
      inject: [ConfigService],
    },
    FileService,
  ],
  exports: [FileService],
})
export class FileModule implements OnModuleInit {
  private readonly logger = new Logger(FileModule.name);

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const bucket = this.configService.get<string>('MINIO_BUCKET');
    if (!bucket) {
      throw new Error('MINIO_BUCKET environment variable is required');
    }
    const exists = await this.minioClient.bucketExists(bucket);
    if (exists) {
      this.logger.log(`Minio bucket "${bucket}" found`);
    } else {
      await this.minioClient.makeBucket(bucket, 'us-east-1');
      this.logger.log(`Minio bucket "${bucket}" created`);
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };
    await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
    this.logger.log(`Public read policy applied to bucket "${bucket}"`);
  }
}
