import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranslatorRepository } from './translator.repository';
import {
  CreateTranslatorDto,
  UpdateTranslatorDto,
} from 'src/modules/translator/dto/translator.dto';

@Injectable()
export class TranslatorService {
  constructor(private readonly translatorRepository: TranslatorRepository) {}

  findAll = async (search?: string, page?: number, limit?: number) => {
    return await this.translatorRepository.findAll(search, page, limit);
  };

  findOne = async (id: number) => {
    const translator = await this.translatorRepository.findOneById(id);
    if (!translator) {
      throw new NotFoundException(`Translator with ID ${id} not found`);
    }
    return translator;
  };

  create = async (dto: CreateTranslatorDto) => {
    const existing = await this.translatorRepository.findOneByName(dto.name);
    if (existing) {
      throw new BadRequestException(`Translator "${dto.name}" already exists`);
    }
    return await this.translatorRepository.create({
      name: dto.name,
      note: dto.note ?? undefined,
    });
  };

  update = async (id: number, dto: UpdateTranslatorDto) => {
    const translator = await this.translatorRepository.findOneById(id);
    if (!translator) {
      throw new NotFoundException(`Translator with ID ${id} not found`);
    }

    if (dto.name && dto.name !== translator.name) {
      const taken = await this.translatorRepository.findOneByName(dto.name);
      if (taken) {
        throw new BadRequestException(
          `Translator "${dto.name}" already exists`,
        );
      }
    }

    return await this.translatorRepository.update(id, {
      name: dto.name,
      note: dto.note,
    });
  };

  delete = async (id: number) => {
    const translator = await this.translatorRepository.findOneById(id);
    if (!translator) {
      throw new NotFoundException(`Translator with ID ${id} not found`);
    }
    await this.translatorRepository.delete(id);
  };
}
