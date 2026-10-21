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
        const endpoint = configService.get<string>('STORAGE_ENDPOINT');
        const region = configService.get<string>('STORAGE_REGION');
        const accessKey = configService.get<string>('STORAGE_ACCESS_KEY');
        const secretKey = configService.get<string>('STORAGE_SECRET_KEY');
        const bucket = configService.get<string>('STORAGE_BUCKET');

        if (!region) {
          throw new Error('STORAGE_REGION environment variable is required');
        }
        if (!accessKey) {
          throw new Error(
            'STORAGE_ACCESS_KEY environment variable is required',
          );
        }
        if (!secretKey) {
          throw new Error(
            'STORAGE_SECRET_KEY environment variable is required',
          );
        }
        if (!bucket) {
          throw new Error('STORAGE_BUCKET environment variable is required');
        }

        return new S3Client({
          region,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        });
      },
      inject: [ConfigService],
    },
    FileService,
  ],
  exports: [FileService],
})
export class FileModule {}
