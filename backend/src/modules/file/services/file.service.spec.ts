import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { MINIO_CLIENT } from '../file.module';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, NotFoundException, StreamableFile } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'node:stream';

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

  describe('download', () => {
    it('returns StreamableFile for existing key', async () => {
      const stream = Readable.from(['test-data']);
      mockMinioClient.getObject.mockResolvedValue(stream);

      const result = await service.download('covers/test.jpg');

      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(expect.any(String), 'covers/test.jpg');
    });

    it('throws NotFoundException for NoSuchKey error', async () => {
      const err = new Error('Not found');
      (err as any).code = 'NoSuchKey';
      mockMinioClient.getObject.mockRejectedValue(err);

      await expect(service.download('covers/missing.jpg')).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException for other Minio errors', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('timeout'));

      await expect(service.download('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    it('removes object from Minio', async () => {
      await service.delete('covers/test.jpg');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(expect.any(String), 'covers/test.jpg');
    });

    it('throws InternalServerErrorException on Minio error', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('remove failed'));

      await expect(service.delete('covers/test.jpg')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('list', () => {
    it('returns all keys with no prefix', async () => {
      const mockStream = Readable.from([{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }]);
      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.list();

      expect(result).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(expect.any(String), '', true);
    });

    it('returns filtered keys with prefix', async () => {
      const mockStream = Readable.from([{ name: 'covers/x.jpg' }, { name: 'covers/y.jpg' }]);
      mockMinioClient.listObjects.mockReturnValue(mockStream);

      const result = await service.list('covers');

      expect(result).toEqual(['covers/x.jpg', 'covers/y.jpg']);
      expect(mockMinioClient.listObjects).toHaveBeenCalledWith(expect.any(String), 'covers', true);
    });

    it('throws InternalServerErrorException on stream error', async () => {
      const mockStream = new Readable({ objectMode: true, read() {} });
      mockMinioClient.listObjects.mockReturnValue(mockStream);
      mockStream.destroy(new Error('stream failed'));

      await expect(service.list()).rejects.toThrow(InternalServerErrorException);
    });
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
