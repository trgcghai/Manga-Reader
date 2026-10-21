import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { BadRequestException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';

describe('FileController', () => {
  let controller: FileController;

  const mockFileService = {
    upload: jest.fn(),
    uploadTranslation: jest.fn(),
    delete: jest.fn(),
    download: jest.fn(),
    list: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
    publicUrl: 'https://cdn.example.com/assets',
    bucket: 'manga-pages',
  } as jest.Mocked<
    Pick<
      FileService,
      | 'upload'
      | 'uploadTranslation'
      | 'delete'
      | 'download'
      | 'list'
      | 'publicUrl'
      | 'bucket'
    >
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [{ provide: FileService, useValue: mockFileService }],
    }).compile();

    controller = module.get<FileController>(FileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /files/upload/cover', () => {
    it('should upload cover file and return key and url', async () => {
      const mockResult = {
        key: 'manga/cover/uuid.jpg',
        url: 'https://cdn.example.com/assets/manga-pages/manga/cover/uuid.jpg',
      };
      mockFileService.upload.mockResolvedValue(mockResult);

      const file = {
        originalname: 'cover.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await controller.uploadCover(file);
      expect(result).toEqual(mockResult);
      expect(mockFileService.upload).toHaveBeenCalledWith(
        'manga/cover',
        file.buffer,
        file.mimetype,
      );
    });
  });

  describe('POST /files/upload/translation', () => {
    it('should upload translation file with mangaId and chapterNumber', async () => {
      const mockResult = {
        key: 'manga/1/chapter/3/translations/uuid.cbz',
        url: 'https://cdn.example.com/assets/manga-pages/manga/1/chapter/3/translations/uuid.cbz',
      };
      mockFileService.upload.mockResolvedValue(mockResult);

      const file = {
        originalname: 'chapter.cbz',
        buffer: Buffer.from('test'),
        mimetype: 'application/zip',
      } as Express.Multer.File;

      const dto = { mangaId: 1, chapterNumber: 3 };

      mockFileService.uploadTranslation.mockResolvedValue(mockResult);

      const result = await controller.uploadTranslation(file, dto);
      expect(result).toEqual(mockResult);
      expect(mockFileService.uploadTranslation).toHaveBeenCalledWith(
        'manga/1/chapter/3/translations',
        file,
      );
    });
  });

  describe('DELETE /files/:key', () => {
    it('should delete file by key', async () => {
      mockFileService.delete.mockResolvedValue(undefined);
      await controller.delete('covers/test.jpg');
      expect(mockFileService.delete).toHaveBeenCalledWith('covers/test.jpg');
    });
  });

  describe('GET /files/download', () => {
    it('should return StreamableFile when valid url provided', async () => {
      const mockStream = new Readable();
      mockStream.push('test-data');
      mockStream.push(null);
      const mockStreamableFile = new StreamableFile(mockStream);
      mockFileService.download.mockResolvedValue(mockStreamableFile);

      const result = await controller.download(
        'https://cdn.example.com/assets/manga-pages/manga/1/chapter/1/translations/file.cbz',
      );

      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockFileService.download).toHaveBeenCalledWith(
        'manga/1/chapter/1/translations/file.cbz',
      );
    });

    it('should throw BadRequestException when url is missing', async () => {
      await expect(controller.download('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a URL outside the configured public storage location', async () => {
      await expect(
        controller.download(
          'https://elsewhere.example.com/assets/manga-pages/file.cbz',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
