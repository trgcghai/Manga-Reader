import { Global, Module, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { FileService } from './file.service';
import { FileController } from './file.controller';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT')!;
        const url = new URL(endpoint);
        return new Minio.Client({
          endPoint: url.hostname,
          port: Number(url.port) || 9000,
          useSSL: url.protocol === 'https:',
          accessKey: configService.get<string>('MINIO_ACCESS_KEY')!,
          secretKey: configService.get<string>('MINIO_SECRET_KEY')!,
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

  async onModuleInit() {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (exists) {
        this.logger.log(`Minio bucket "${bucket}" found`);
      } else {
        await this.minioClient.makeBucket(bucket, 'us-east-1');
        this.logger.log(`Minio bucket "${bucket}" created`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to verify Minio bucket "${bucket}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
