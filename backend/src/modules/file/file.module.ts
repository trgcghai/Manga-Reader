import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { STORAGE_CLIENT } from 'src/common/constants/file.constant';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FileController],
  providers: [
    {
      provide: STORAGE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const [endpoint, region, accessKey, secretKey] = [
          configService.getOrThrow<string>('STORAGE_ENDPOINT'),
          configService.getOrThrow<string>('STORAGE_REGION'),
          configService.getOrThrow<string>('STORAGE_ACCESS_KEY'),
          configService.getOrThrow<string>('STORAGE_SECRET_KEY'),
        ];

        return new S3Client({
          region,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          endpoint,
          forcePathStyle: true,
        });
      },
      inject: [ConfigService],
    },
    FileService,
  ],
  exports: [FileService],
})
export class FileModule {}
