import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { join, resolve } from 'path';
import { ChapterService } from './chapter.service';

describe('ChapterService', () => {
  let service: ChapterService;
  const fixturesRoot = join(__dirname, '__fixtures__', 'scan-images');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChapterService],
    }).compile();

    service = module.get<ChapterService>(ChapterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scanImages', () => {
    it('returns the resolved path and direct child images in natural order', async () => {
      const targetPath = join(fixturesRoot, 'mixed');

      await expect(service.scanImages(targetPath)).resolves.toEqual({
        path: resolve(targetPath),
        images: [
          {
            name: '001.jpg',
            path: resolve(targetPath, '001.jpg'),
            extension: 'jpg',
          },
          {
            name: '002.webp',
            path: resolve(targetPath, '002.webp'),
            extension: 'webp',
          },
          {
            name: '010.png',
            path: resolve(targetPath, '010.png'),
            extension: 'png',
          },
          {
            name: 'animated.GIF',
            path: resolve(targetPath, 'animated.GIF'),
            extension: 'gif',
          },
          {
            name: 'COVER.JPEG',
            path: resolve(targetPath, 'COVER.JPEG'),
            extension: 'jpeg',
          },
        ],
      });
    });

    it('ignores non-images, directories, and nested images', async () => {
      const targetPath = join(fixturesRoot, 'mixed');

      const result = await service.scanImages(targetPath);
      const imageNames = result.images.map((image) => image.name);

      expect(imageNames).toEqual([
        '001.jpg',
        '002.webp',
        '010.png',
        'animated.GIF',
        'COVER.JPEG',
      ]);
      expect(imageNames).not.toContain('notes.txt');
      expect(imageNames).not.toContain('archive.cbz');
      expect(imageNames).not.toContain('nested-folder');
      expect(imageNames).not.toContain('ignored.jpg');
    });

    it('returns an empty image list for an empty readable folder', async () => {
      const targetPath = join(fixturesRoot, 'empty');

      await expect(service.scanImages(targetPath)).resolves.toEqual({
        path: resolve(targetPath),
        images: [],
      });
    });

    it('throws when the path query parameter is blank or missing', async () => {
      await expect(service.scanImages('')).rejects.toThrow(BadRequestException);
      await expect(service.scanImages('')).rejects.toThrow(
        'Path query parameter is required',
      );
      await expect(service.scanImages('   ')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scanImages('   ')).rejects.toThrow(
        'Path query parameter is required',
      );
    });

    it('throws when the path does not exist or cannot be read', async () => {
      await expect(
        service.scanImages(join(fixturesRoot, 'missing')),
      ).rejects.toThrow('Path does not exist or cannot be read');
    });

    it('throws when the path is not a readable directory', async () => {
      await expect(
        service.scanImages(join(fixturesRoot, 'mixed', '001.jpg')),
      ).rejects.toThrow('Path must be a readable directory');
    });
  });
});
