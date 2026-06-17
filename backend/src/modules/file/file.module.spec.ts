import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FileModule, MINIO_CLIENT } from './file.module';
import * as Minio from 'minio';

describe('FileModule', () => {
  it('should provide MINIO_CLIENT as a Minio.Client instance', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => ({
            MINIO_ENDPOINT: 'http://localhost:9000',
            MINIO_ACCESS_KEY: 'test',
            MINIO_SECRET_KEY: 'test',
            MINIO_BUCKET: 'test-bucket',
          })],
        }),
        FileModule,
      ],
    }).compile();

    const minioClient = module.get<Minio.Client>(MINIO_CLIENT);
    expect(minioClient).toBeDefined();
    expect(minioClient).toBeInstanceOf(Minio.Client);
  });
});
