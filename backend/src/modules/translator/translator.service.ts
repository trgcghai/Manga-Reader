import { Injectable } from '@nestjs/common';

@Injectable()
export class TranslatorService {
  create() {
    return 'This action adds a new translator';
  }

  findAll() {
    return `This action returns all translator`;
  }

  findOne(id: number) {
    return `This action returns a #${id} translator`;
  }

  update(id: number) {
    return `This action updates a #${id} translator`;
  }

  remove(id: number) {
    return `This action removes a #${id} translator`;
  }
}
