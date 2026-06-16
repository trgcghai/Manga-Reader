import { Global, Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT')!;
        const url = new URL(endpoint);
        return new Minio.Client({
          endPoint: url.hostname,
          port: parseInt(url.port) || 9000,
          useSSL: url.protocol === 'https:',
          accessKey: configService.get<string>('MINIO_ACCESS_KEY')!,
          secretKey: configService.get<string>('MINIO_SECRET_KEY')!,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MINIO_CLIENT],
})
export class FileModule implements OnModuleInit {
  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket, 'us-east-1');
    }
  }
}
