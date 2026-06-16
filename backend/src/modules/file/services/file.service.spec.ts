import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { MINIO_CLIENT } from '../file.module';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';

describe('FileService', () => {
  let service: FileService;
  let mockMinioClient: jest.Mocked<Pick<Minio.Client, 'putObject' | 'getObject' | 'removeObject' | 'listObjects'>>;

  beforeEach(async () => {
    mockMinioClient = {
      putObject: jest.fn().mockResolvedValue(undefined),
      getObject: jest.fn(),
      removeObject: jest.fn().mockResolvedValue(undefined),
      listObjects: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: MINIO_CLIENT, useValue: mockMinioClient },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const map: Record<string, string> = {
                MINIO_BUCKET: 'manga-pages',
                MINIO_ENDPOINT: 'http://localhost:9000',
              };
              return map[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('upload', () => {
    const prefix = 'covers';
    const buffer = Buffer.from('test-image-data');
    const mimetype = 'image/jpeg';

    it('stores file and returns full URL', async () => {
      const url = await service.upload(prefix, buffer, mimetype);

      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^covers\/.+\.jpg$/),
        buffer,
        expect.objectContaining({ 'Content-Type': mimetype }),
      );
      expect(url).toMatch(/^http:\/\/localhost:9000\/manga-pages\/covers\/.+\.jpg$/);
    });

    it('propagates Minio error as InternalServerErrorException', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('connection lost'));

      await expect(service.upload(prefix, buffer, mimetype)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
