import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { MINIO_CLIENT } from './file.constants';
import { ConfigModule } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'node:stream';

describe('FileService', () => {
  let service: FileService;

  const mockMinioClient = {
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    listObjects: jest.fn(),
    presignedPutObject: jest.fn(),
  } as unknown as jest.Mocked<Minio.Client>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [
            () => ({
              MINIO_ENDPOINT: 'http://localhost:9000',
              MINIO_ACCESS_KEY: 'test',
              MINIO_SECRET_KEY: 'test',
              MINIO_BUCKET: 'test-bucket',
            }),
          ],
        }),
      ],
      providers: [
        FileService,
        { provide: MINIO_CLIENT, useValue: mockMinioClient },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should map application/zip to .zip extension', async () => {
      mockMinioClient.putObject.mockResolvedValue({
        etag: '"abc123"',
        versionId: null,
      });
      const result = await service.upload(
        'prefix',
        Buffer.from('data'),
        'application/zip',
      );
      expect(result.key).toMatch(/\.zip$/);
    });

    it('should upload a buffer and return key and Minio URL', async () => {
      mockMinioClient.putObject.mockResolvedValue({
        etag: '"abc123"',
        versionId: null,
      });
      const buffer = Buffer.from('test-image-data');
      const result = await service.upload('covers', buffer, 'image/jpeg');
      expect(result.key).toMatch(/^covers\/.+\.jpg$/);
      expect(result.url).toMatch(
        /^http:\/\/localhost:9000\/test-bucket\/covers\/.+\.jpg$/,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      mockMinioClient.putObject.mockRejectedValue(
        new Error('Connection refused'),
      );
      await expect(
        service.upload('covers', Buffer.from('test'), 'image/png'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('download', () => {
    it('should return a StreamableFile', async () => {
      const mockStream = Readable.from(['test-data']);
      mockMinioClient.getObject.mockResolvedValue(mockStream);
      const result = await service.download('covers/test.jpg');
      expect(result).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(
        'test-bucket',
        'covers/test.jpg',
      );
    });

    it('should throw NotFoundException when file does not exist', async () => {
      const error = new Error('Not found') as Error & { code: string };
      error.code = 'NoSuchKey';
      mockMinioClient.getObject.mockRejectedValue(error);
      await expect(service.download('covers/missing.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should call removeObject with correct key', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);
      await service.delete('covers/test.jpg');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'test-bucket',
        'covers/test.jpg',
      );
    });

    it('should throw InternalServerErrorException on failure', async () => {
      mockMinioClient.removeObject.mockRejectedValue(
        new Error('Access denied'),
      );
      await expect(service.delete('covers/test.jpg')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('list', () => {
    it('should return list of file keys', async () => {
      const gen = (function* () {
        yield { name: 'covers/a.jpg' };
        yield { name: 'covers/b.jpg' };
      })();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockMinioClient.listObjects.mockReturnValue(gen as any);
      const result = await service.list('covers');
      expect(result).toEqual(['covers/a.jpg', 'covers/b.jpg']);
    });

    it('should throw InternalServerErrorException on list failure', async () => {
      const errorStream = {
        [Symbol.asyncIterator]() {
          return {
            next() {
              return Promise.reject(new Error('Connection lost'));
            },
          };
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      mockMinioClient.listObjects.mockReturnValue(errorStream as any);
      await expect(service.list('covers')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('returns uploadUrl, key, and expiresIn for valid content type', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue(
        'http://minio/upload-url',
      );

      const result = await service.generatePresignedUploadUrl(
        'manga/cover',
        'image/jpeg',
        5 * 1024 * 1024,
      );

      expect(result).toMatchObject({
        uploadUrl: 'http://minio/upload-url',
        key: expect.stringMatching(/^manga\/cover\/.+\.jpg$/),
        expiresIn: 3600,
      });
    });

    it('rejects unknown content type', async () => {
      await expect(
        service.generatePresignedUploadUrl(
          'manga/cover', 'image/avif', 1024,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes contentType to presignedPutObject', async () => {
      mockMinioClient.presignedPutObject.mockResolvedValue(
        'http://minio/url',
      );

      await service.generatePresignedUploadUrl(
        'manga/cover', 'image/png', 1024,
      );

      expect(mockMinioClient.presignedPutObject).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringMatching(/\.png$/),
        3600,
        { contentType: 'image/png' },
      );
    });
  });
});
