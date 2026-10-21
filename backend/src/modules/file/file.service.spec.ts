import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { STORAGE_CLIENT } from 'src/common/constants/file.constant';
import { FileService } from './file.service';

describe('FileService', () => {
  let service: FileService;

  let mockS3Client: S3Client;
  let sendMock: jest.SpyInstance;

  beforeEach(async () => {
    mockS3Client = new S3Client({
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
    sendMock = jest.spyOn(mockS3Client, 'send');

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [
            () => ({
              STORAGE_ENDPOINT: 'http://localhost:9000',
              STORAGE_PUBLIC_URL: 'https://cdn.example.com',
              STORAGE_REGION: 'us-east-1',
              STORAGE_ACCESS_KEY: 'test',
              STORAGE_SECRET_KEY: 'test',
              STORAGE_BUCKET: 'test-bucket',
            }),
          ],
        }),
      ],
      providers: [
        FileService,
        { provide: STORAGE_CLIENT, useValue: mockS3Client },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should map application/zip to .zip extension', async () => {
      sendMock.mockResolvedValue({} as never);

      const result = await service.upload(
        'prefix',
        Buffer.from('data'),
        'application/zip',
      );

      expect(result.key).toMatch(/\.zip$/);
    });

    it('uploads an object and returns its public storage URL', async () => {
      sendMock.mockResolvedValue({ ETag: 'abc123' } as never);
      const buffer = Buffer.from('test-image-data');

      const result = await service.upload('covers', buffer, 'image/jpeg');

      expect(result.key).toMatch(/^covers\/.+\.jpeg$/);
      expect(result.url).toBe(
        `https://cdn.example.com/test-bucket/${result.key}`,
      );
      const command = sendMock.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: result.key,
        Body: buffer,
        ContentType: 'image/jpeg',
      });
    });

    it('throws InternalServerErrorException when upload fails', async () => {
      sendMock.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.upload('covers', Buffer.from('test'), 'image/png'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('download', () => {
    it('returns a StreamableFile for the requested object', async () => {
      const body = Readable.from(['test-data']);
      sendMock.mockResolvedValue({ Body: body } as never);

      const result = await service.download('covers/test.jpg');

      expect(result).toBeDefined();
      const command = sendMock.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'covers/test.jpg',
      });
    });

    it('throws NotFoundException when the object does not exist', async () => {
      const error = Object.assign(new Error('Not found'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      });
      sendMock.mockRejectedValue(error);

      await expect(service.download('covers/missing.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes the requested object', async () => {
      sendMock.mockResolvedValue({} as never);

      await service.delete('covers/test.jpg');

      const command = sendMock.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'covers/test.jpg',
      });
    });

    it('throws InternalServerErrorException when delete fails', async () => {
      sendMock.mockRejectedValue(new Error('Access denied'));

      await expect(service.delete('covers/test.jpg')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('list', () => {
    it('returns object keys across all S3 listing pages', async () => {
      sendMock
        .mockResolvedValueOnce({
          Contents: [{ Key: 'covers/a.jpg' }],
          IsTruncated: true,
          NextContinuationToken: 'next-page',
        } as never)
        .mockResolvedValueOnce({
          Contents: [{ Key: 'covers/b.jpg' }],
          IsTruncated: false,
        } as never);

      const result = await service.list('covers');

      expect(result).toEqual(['covers/a.jpg', 'covers/b.jpg']);
      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(sendMock.mock.calls[0][0]).toBeInstanceOf(
        ListObjectsV2Command,
      );
      expect(sendMock.mock.calls[1][0].input).toMatchObject({
        ContinuationToken: 'next-page',
      });
      expect(sendMock.mock.calls[0][0].input).toMatchObject({
        Bucket: 'test-bucket',
        Prefix: 'covers',
      });
    });

    it('throws InternalServerErrorException when listing fails', async () => {
      sendMock.mockRejectedValue(new Error('Connection lost'));

      await expect(service.list('covers')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
