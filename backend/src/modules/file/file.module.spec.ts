import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FileModule, MINIO_CLIENT } from './file.module';
import * as Minio from 'minio';

describe('FileModule', () => {
  it('should provide MINIO_CLIENT as a Minio.Client instance', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: false }), FileModule],
    }).compile();

    const minioClient = module.get<Minio.Client>(MINIO_CLIENT);
    expect(minioClient).toBeDefined();
    expect(minioClient).toBeInstanceOf(Minio.Client);
  });
});
