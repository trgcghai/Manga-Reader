import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { STORAGE_CLIENT } from 'src/common/constants/file.constant';
import { FileModule } from './file.module';
import { FileService } from './file.service';

describe('FileModule', () => {
  let moduleRef: TestingModule;

  async function compileModule(storageEndpoint?: string) {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [
            () => ({
              STORAGE_ENDPOINT: storageEndpoint,
              STORAGE_REGION: 'us-east-1',
              STORAGE_ACCESS_KEY: 'test-access-key',
              STORAGE_SECRET_KEY: 'test-secret-key',
              STORAGE_BUCKET: 'test-bucket',
              MINIO_ENDPOINT: 'http://localhost:9000',
              MINIO_ACCESS_KEY: 'legacy-test-access-key',
              MINIO_SECRET_KEY: 'legacy-test-secret-key',
            }),
          ],
        }),
        FileModule,
      ],
    })
      .overrideProvider(FileService)
      .useValue({})
      .compile();

    return moduleRef.get<S3Client>(STORAGE_CLIENT);
  }

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('configures a path-style S3 client for a custom storage endpoint', async () => {
    const client = await compileModule('http://storage.example:9000');

    expect(client).toBeInstanceOf(S3Client);
    expect(await client.config.region()).toBe('us-east-1');
    expect(client.config.forcePathStyle).toBe(true);
    expect(await client.config.endpoint()).toMatchObject({
      protocol: 'http:',
      hostname: 'storage.example',
      port: 9000,
    });
    expect(await client.config.credentials()).toMatchObject({
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    });
  });

  it('uses AWS default endpoint resolution when no custom endpoint is set', async () => {
    const client = await compileModule();

    expect(client.config.endpoint).toBeUndefined();
    expect(client.config.forcePathStyle).toBe(false);
  });
});
