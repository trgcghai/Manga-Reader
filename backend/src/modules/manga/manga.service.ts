import { Injectable } from '@nestjs/common';

@Injectable()
export class MangaService {
  create() {
    return { message: 'This action adds a new manga' };
  }

  findAll() {
    return { message: 'This action returns all manga' };
  }

  findOne(id: number) {
    return { message: `This action returns a #${id} manga` };
  }

  update(id: number) {
    return { message: `This action updates a #${id} manga` };
  }

  remove(id: number) {
    return { message: `This action removes a #${id} manga` };
  }
}
