import { BadRequestException, Injectable } from '@nestjs/common';
import { Dirent } from 'fs';
import { readdir, stat } from 'fs/promises';
import { extname, resolve } from 'path';
import {
  filenameCollator,
  ImageExtension,
  ScanImagesResult,
  SUPPORTED_IMAGE_EXTENSIONS,
} from 'src/common/constants/chapter.constant';

@Injectable()
export class ChapterService {
  async scanImages(inputPath: string): Promise<ScanImagesResult> {
    if (!inputPath?.trim()) {
      throw new BadRequestException('Path query parameter is required');
    }

    const resolvedPath = resolve(inputPath);

    try {
      const pathStats = await stat(resolvedPath);

      if (!pathStats.isDirectory()) {
        throw new BadRequestException('Path must be a readable directory');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Path does not exist or cannot be read');
    }

    let entries: Dirent[];

    try {
      entries = await readdir(resolvedPath, { withFileTypes: true });
    } catch {
      throw new BadRequestException('Path does not exist or cannot be read');
    }

    const images = entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const extension = extname(entry.name).slice(1).toLowerCase();

        return {
          entry,
          extension,
        };
      })
      .filter((image): image is { entry: Dirent; extension: ImageExtension } =>
        SUPPORTED_IMAGE_EXTENSIONS.has(image.extension as ImageExtension),
      )
      .sort((left, right) =>
        filenameCollator.compare(left.entry.name, right.entry.name),
      )
      .map(({ entry, extension }) => ({
        name: entry.name,
        path: resolve(resolvedPath, entry.name),
        extension,
      }));

    return {
      path: resolvedPath,
      images,
    };
  }

  create() {
    return 'This action adds a new chapter';
  }

  findAll() {
    return `This action returns all chapter`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chapter`;
  }

  update(id: number) {
    return `This action updates a #${id} chapter`;
  }

  remove(id: number) {
    return `This action removes a #${id} chapter`;
  }
}
