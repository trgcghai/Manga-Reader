import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';

describe('FileController', () => {
  let controller: FileController;

  const mockFileService = {
    upload: jest.fn(),
    delete: jest.fn(),
    download: jest.fn(),
    list: jest.fn(),
  } as jest.Mocked<Pick<FileService, 'upload' | 'delete'>>;

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
        url: 'http://localhost:9000/manga-pages/manga/cover/uuid.jpg',
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
        url: 'http://localhost:9000/manga-pages/manga/1/chapter/3/translations/uuid.cbz',
      };
      mockFileService.upload.mockResolvedValue(mockResult);

      const file = {
        originalname: 'chapter.cbz',
        buffer: Buffer.from('test'),
        mimetype: 'application/zip',
      } as Express.Multer.File;

      const dto = { mangaId: 1, chapterNumber: 3 };

      const result = await controller.uploadTranslation(file, dto);
      expect(result).toEqual(mockResult);
      expect(mockFileService.upload).toHaveBeenCalledWith(
        'manga/1/chapter/3/translations',
        file.buffer,
        file.mimetype,
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
});
