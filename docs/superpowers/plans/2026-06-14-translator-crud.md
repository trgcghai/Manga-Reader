# Translator CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for standalone Translator entity (name + optional note).

**Architecture:** Backend repository pattern (NestJS + TypeORM + PostgreSQL), frontend TanStack Start + React Query + shadcn UI, following exact patterns from existing Author/Genre modules.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, TanStack Query, shadcn/ui, lucide-react

**Reference patterns:** Author module (`backend/src/modules/author/`), Author frontend (`frontend/src/routes/admin/authors.tsx`, `frontend/src/services/api/authorApi.ts`, `frontend/src/hooks/useAuthors.ts`, `frontend/src/components/author/`)

**Skill mapping by task:**
- **Task 1** (Repository/DTOs/Module): `nestjs-best-practices`, `vitest`
- **Task 2** (Service/Controller): `nestjs-best-practices`
- **Task 3** (Service/Controller specs): `nestjs-testing`, `vitest`
- **Task 4** (Repository spec + E2E): `nestjs-testing`, `vitest`
- **Task 5** (Frontend API + Hooks): `tanstack-query-best-practices`
- **Task 6** (Frontend UI + Route): `shadcn`, `tanstack-router-best-practices`

---

### Task 1: Backend — TranslatorRepository + DTOs + Module wiring
**Skills:** `nestjs-best-practices`, `vitest`

**Files:**
- Create: `backend/src/modules/translator/dto/translator.dto.ts`
- Create: `backend/src/modules/translator/dto/translator.dto.spec.ts`
- Create: `backend/src/modules/translator/translator.repository.ts`
- Modify: `backend/src/modules/translator/translator.module.ts`

- [ ] **Step 1: Create translator.dto.ts**

```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTranslatorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateTranslatorDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
```

- [ ] **Step 2: Create translator.dto.spec.ts**

```typescript
import { validate } from 'class-validator';
import { CreateTranslatorDto, UpdateTranslatorDto } from './translator.dto';

describe('CreateTranslatorDto', () => {
  it('should pass with valid name and optional note', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = 'Valid Name';
    dto.note = 'Some note';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid name and no note', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateTranslatorDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateTranslatorDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateTranslatorDto', () => {
  it('should pass with valid name and note', async () => {
    const dto = new UpdateTranslatorDto();
    dto.name = 'Valid Name';
    dto.note = 'Valid note';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = new UpdateTranslatorDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Step 3: Create translator.repository.ts** (no relation count/cleanup unlike Author)

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import { Repository } from 'typeorm';

export class TranslatorRepository {
  constructor(
    @InjectRepository(Translator)
    private readonly repo: Repository<Translator>,
  ) {}

  findOneByName = async (name: string): Promise<Translator | null> => {
    return await this.repo.findOne({
      where: { name: name.trim() },
    });
  };

  create = async (data: Partial<Translator>): Promise<Translator> => {
    return await this.repo.save(data);
  };

  findAll = async (
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Translator[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.repo.createQueryBuilder('translator');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('translator.name', 'ASC');

    if (search) {
      qb.where('translator.name ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  findOneById = async (id: number): Promise<Translator | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  update = async (
    id: number,
    data: Partial<Translator>,
  ): Promise<Translator | null> => {
    const translator = await this.repo.findOne({ where: { id } });
    if (!translator) return null;

    if (data.name !== undefined) translator.name = data.name;
    if (data.note !== undefined) translator.note = data.note;

    return await this.repo.save(translator);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
```

- [ ] **Step 4: Modify translator.module.ts**

Current file (`backend/src/modules/translator/translator.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { TranslatorService } from './translator.service';
import { TranslatorController } from './translator.controller';
```

Replace with:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import { TranslatorRepository } from 'src/modules/translator/translator.repository';
import { TranslatorService } from './translator.service';
import { TranslatorController } from './translator.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Translator])],
  controllers: [TranslatorController],
  providers: [TranslatorService, TranslatorRepository],
  exports: [TranslatorService, TranslatorRepository],
})
export class TranslatorModule {}
```

- [ ] **Step 5: Run existing translator tests to verify nothing broken**

Run: `cd backend && npm run test -- --testPathPattern=translator`
Expected: 2 tests pass (the old stub tests)

---

### Task 2: Backend — TranslatorService + TranslatorController
**Skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/translator/translator.service.ts`
- Modify: `backend/src/modules/translator/translator.controller.ts`

- [ ] **Step 1: Rewrite translator.service.ts**

```typescript
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
      note: dto.note ?? null,
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
        throw new BadRequestException(`Translator "${dto.name}" already exists`);
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
```

- [ ] **Step 2: Rewrite translator.controller.ts** (route changed from `'translator'` to `'translators'`)

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { TranslatorService } from './translator.service';
import {
  CreateTranslatorDto,
  UpdateTranslatorDto,
} from 'src/modules/translator/dto/translator.dto';

@Controller('translators')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) {}

  @Post()
  create(@Body() dto: CreateTranslatorDto) {
    return this.translatorService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.translatorService.findAll(
      search,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.translatorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTranslatorDto) {
    return this.translatorService.update(+id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.translatorService.delete(+id);
  }
}
```

---

### Task 3: Backend — TranslatorService + Controller specs
**Skills:** `nestjs-testing`, `vitest`

**Files:**
- Modify: `backend/src/modules/translator/translator.service.spec.ts`
- Modify: `backend/src/modules/translator/translator.controller.spec.ts`

- [ ] **Step 1: Rewrite translator.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TranslatorService } from './translator.service';
import { TranslatorRepository } from './translator.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorService', () => {
  let service: TranslatorService;
  const mockRepo = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOneByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslatorService,
        { provide: TranslatorRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(TranslatorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated translators', async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockRepo.findAll.mockResolvedValue(expected);
      expect(await service.findAll('search', 2, 10)).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith('search', 2, 10);
    });
  });

  describe('findOne', () => {
    it('should return translator when found', async () => {
      const translator = { id: 1, name: 'Test' } as Translator;
      mockRepo.findOneById.mockResolvedValue(translator);
      expect(await service.findOne(1)).toEqual(translator);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new translator', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 1, name: 'New Translator', note: 'A note' } as Translator;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'New Translator', note: 'A note' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Translator', note: 'A note' });
    });

    it('should create with null note when note not provided', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 1, name: 'New Translator', note: null } as Translator;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'New Translator' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Translator', note: null });
    });

    it('should throw BadRequestException on duplicate name', async () => {
      mockRepo.findOneByName.mockResolvedValue({ id: 1, name: 'Existing' });
      await expect(service.create({ name: 'Existing' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update translator name and note', async () => {
      const existing = { id: 1, name: 'Old', note: 'Old note' } as Translator;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(null);
      const updated = { id: 1, name: 'New', note: 'New note' } as Translator;
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'New', note: 'New note' });

      expect(result).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New', note: 'New note' });
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new name is taken', async () => {
      const existing = { id: 1, name: 'Old' } as Translator;
      const taken = { id: 2, name: 'Taken' } as Translator;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(taken);
      await expect(service.update(1, { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing translator', async () => {
      mockRepo.findOneById.mockResolvedValue({ id: 1 });
      mockRepo.delete.mockResolvedValue(true);
      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Rewrite translator.controller.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TranslatorController } from './translator.controller';
import { TranslatorService } from './translator.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreateTranslatorDto,
  UpdateTranslatorDto,
} from 'src/modules/translator/dto/translator.dto';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorController', () => {
  let controller: TranslatorController;
  let service: jest.Mocked<TranslatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslatorController],
      providers: [
        {
          provide: TranslatorService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TranslatorController>(TranslatorController);
    service = module.get(TranslatorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated translators', async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('search', '2', '10');

      expect(service.findAll).toHaveBeenCalledWith('search', 2, 10);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return translator by id', async () => {
      const translator = { id: 1, name: 'Test' } as unknown as Translator;
      service.findOne.mockResolvedValue(translator);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(translator);
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new translator', async () => {
      const dto: CreateTranslatorDto = { name: 'New Translator', note: 'Note' };
      const created = { id: 1, name: 'New Translator', note: 'Note' } as unknown as Translator;
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on duplicate name', async () => {
      service.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ name: 'Duplicate' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the translator', async () => {
      const dto: UpdateTranslatorDto = { name: 'Updated', note: 'Updated note' };
      const updated = { id: 1, name: 'Updated', note: 'Updated note' } as unknown as Translator;
      service.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete translator', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Run unit tests for translator module**

Run: `cd backend && npm run test -- --testPathPattern=translator`
Expected: All tests pass (DTO, service, controller)

---

### Task 4: Backend — Repository spec + E2E test
**Skills:** `nestjs-testing`, `vitest`

**Files:**
- Create: `backend/src/modules/translator/translator.repository.spec.ts`
- Create: `backend/test/translator.e2e-spec.ts`

- [ ] **Step 1: Create translator.repository.spec.ts**

```typescript
import { Repository } from 'typeorm';
import { TranslatorRepository } from './translator.repository';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorRepository', () => {
  let repo: TranslatorRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    repo = new TranslatorRepository(mockRepo as unknown as Repository<Translator>);
    jest.clearAllMocks();
  });

  describe('findOneByName', () => {
    it('should find translator by exact name match', async () => {
      const translator = { id: 1, name: 'Test Translator' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      const result = await repo.findOneByName('Test Translator');

      expect(result).toEqual(translator);
    });

    it('should trim whitespace from name before querying', async () => {
      const translator = { id: 1, name: 'Test Translator' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      await repo.findOneByName('  Test Translator  ');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Translator' },
      });
    });

    it('should return null when no matching translator exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneByName('Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated translators without search', async () => {
      const translators = [
        { id: 1, name: 'Translator A' },
        { id: 2, name: 'Translator B' },
      ] as Translator[];
      const count = 2;

      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, count]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('translator');
      expect(mockQb.orderBy).toHaveBeenCalledWith('translator.name', 'ASC');
      expect(result).toEqual({
        data: translators,
        total: count,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply ILIKE search filter when search param provided', async () => {
      const translators = [{ id: 1, name: 'Test Translator' }] as Translator[];
      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, 1]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await repo.findAll('test');

      expect(mockQb.where).toHaveBeenCalledWith('translator.name ILIKE :search', {
        search: '%test%',
      });
    });

    it('should calculate correct totalPages', async () => {
      const translators = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Translator ${i + 1}`,
      })) as Translator[];
      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, 25]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll(undefined, 1, 10);

      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOneById', () => {
    it('should find translator by id', async () => {
      const translator = { id: 1, name: 'Test' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      const result = await repo.findOneById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(translator);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update translator name and note', async () => {
      const existing = { id: 1, name: 'Old Name', note: 'Old note' } as Translator;
      const saved = { id: 1, name: 'New Name', note: 'New note' } as Translator;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, { name: 'New Name', note: 'New note' });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existing.name).toBe('New Name');
      expect(existing.note).toBe('New note');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(saved);
    });

    it('should return null when translator not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.update(999, { name: 'Nope' });

      expect(result).toBeNull();
    });

    it('should only update provided fields', async () => {
      const existing = { id: 1, name: 'Name', note: 'Note' } as Translator;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, name: 'Updated' });

      const result = await repo.update(1, { name: 'Updated' });

      expect(existing.name).toBe('Updated');
      expect(existing.note).toBe('Note'); // unchanged
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await repo.delete(1);

      expect(mockRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when nothing deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await repo.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should save and return new translator', async () => {
      const translatorData = { name: 'New Translator', note: 'Note' };
      const saved = { id: 1, name: 'New Translator', note: 'Note' } as Translator;
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.create(translatorData);

      expect(mockRepo.save).toHaveBeenCalledWith(translatorData);
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Create e2e test at `backend/test/translator.e2e-spec.ts`**

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TranslatorModule } from '../src/modules/translator/translator.module';
import { Translator } from '../src/modules/translator/entities/translator.entity';

describe('Translator CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let translatorRepo: Repository<Translator>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,
          username: 'manga',
          password: 'manga',
          database: 'manga_reader_test',
          entities: [Translator],
          synchronize: true,
        }),
        TranslatorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    dataSource = moduleFixture.get(DataSource);
    translatorRepo = moduleFixture.get(getRepositoryToken(Translator));
    await app.init();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE translator CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /translators', () => {
    it('should create a translator', async () => {
      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'Test Translator', note: 'Test note' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Translator');
      expect(res.body.note).toBe('Test note');
    });

    it('should create a translator without note', async () => {
      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'No Note Translator' })
        .expect(201);

      expect(res.body.name).toBe('No Note Translator');
      expect(res.body.note).toBeNull();
    });

    it('should return 400 for duplicate name', async () => {
      await translatorRepo.save({ name: 'Duplicate Translator' });

      const res = await request(app.getHttpServer())
        .post('/translators')
        .send({ name: 'Duplicate Translator' })
        .expect(400);

      expect(res.body.message).toBe('Translator "Duplicate Translator" already exists');
    });

    it('should return 400 for empty name', async () => {
      await request(app.getHttpServer())
        .post('/translators')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /translators', () => {
    it('should return paginated list with 3 seeded translators', async () => {
      await translatorRepo.save([
        { name: 'Translator A' },
        { name: 'Translator B' },
        { name: 'Translator C' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators')
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
    });

    it('should filter by search query', async () => {
      await translatorRepo.save([
        { name: 'Yoshihiro Togashi' },
        { name: 'Kentaro Miura' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators?search=Yoshihiro')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Yoshihiro Togashi');
    });

    it('should respect page and limit params', async () => {
      await translatorRepo.save([
        { name: 'Translator 1' },
        { name: 'Translator 2' },
        { name: 'Translator 3' },
        { name: 'Translator 4' },
        { name: 'Translator 5' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/translators?page=2&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.totalPages).toBe(3);
    });
  });

  describe('GET /translators/:id', () => {
    it('should return a translator by id', async () => {
      const translator = await translatorRepo.save({ name: 'Unique Translator' });

      const res = await request(app.getHttpServer())
        .get(`/translators/${translator.id}`)
        .expect(200);

      expect(res.body.id).toBe(translator.id);
      expect(res.body.name).toBe('Unique Translator');
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer()).get('/translators/99999').expect(404);
    });
  });

  describe('PATCH /translators/:id', () => {
    it('should update translator name and note', async () => {
      const translator = await translatorRepo.save({ name: 'Old Name', note: 'Old note' });

      const res = await request(app.getHttpServer())
        .patch(`/translators/${translator.id}`)
        .send({ name: 'New Name', note: 'New note' })
        .expect(200);

      expect(res.body.id).toBe(translator.id);
      expect(res.body.name).toBe('New Name');
      expect(res.body.note).toBe('New note');
    });

    it('should return 400 when new name is already taken', async () => {
      await translatorRepo.save({ name: 'Taken Name' });
      const translator = await translatorRepo.save({ name: 'To Update' });

      const res = await request(app.getHttpServer())
        .patch(`/translators/${translator.id}`)
        .send({ name: 'Taken Name' })
        .expect(400);

      expect(res.body.message).toBe('Translator "Taken Name" already exists');
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer())
        .patch('/translators/99999')
        .send({ name: 'Anything' })
        .expect(404);
    });
  });

  describe('DELETE /translators/:id', () => {
    it('should delete a translator', async () => {
      const translator = await translatorRepo.save({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/translators/${translator.id}`)
        .expect(200);

      const check = await translatorRepo.findOne({ where: { id: translator.id } });
      expect(check).toBeNull();
    });

    it('should return 404 for non-existent translator', async () => {
      await request(app.getHttpServer()).delete('/translators/99999').expect(404);
    });
  });
});
```

- [ ] **Step 3: Run repository spec**

Run: `cd backend && npm run test -- --testPathPattern="translator.repository"`
Expected: All tests pass

---

### Task 5: Frontend — API service + Hooks
**Skills:** `tanstack-query-best-practices`

**Files:**
- Create: `frontend/src/services/api/translatorApi.ts`
- Create: `frontend/src/hooks/useTranslators.ts`

- [ ] **Step 1: Create translatorApi.ts**

```typescript
import axiosInstance from '#/services/api/api'

export interface TranslatorResponse {
  id: number
  name: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTranslatorResponse {
  data: TranslatorResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTranslatorPayload {
  name: string
  note?: string
}

export interface UpdateTranslatorPayload {
  name?: string
  note?: string
}

export async function getTranslators(
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<PaginatedTranslatorResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (search) params.search = search

  const { data } = await axiosInstance.get<PaginatedTranslatorResponse>(
    '/translators',
    { params },
  )
  return data
}

export async function getTranslator(id: number): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.get<TranslatorResponse>(
    `/translators/${id}`,
  )
  return data
}

export async function createTranslator(
  payload: CreateTranslatorPayload,
): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.post<TranslatorResponse>(
    '/translators',
    payload,
  )
  return data
}

export async function updateTranslator(
  id: number,
  payload: UpdateTranslatorPayload,
): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.patch<TranslatorResponse>(
    `/translators/${id}`,
    payload,
  )
  return data
}

export async function deleteTranslator(id: number): Promise<void> {
  await axiosInstance.delete(`/translators/${id}`)
}
```

- [ ] **Step 2: Create useTranslators.ts**

```typescript
import {
  getTranslators,
  getTranslator,
  createTranslator,
  updateTranslator,
  deleteTranslator,
} from '#/services/api/translatorApi'
import type {
  TranslatorResponse,
  PaginatedTranslatorResponse,
  CreateTranslatorPayload,
  UpdateTranslatorPayload,
} from '#/services/api/translatorApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const translatorKeys = {
  all: ['translators'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...translatorKeys.all, 'list', page, limit, search] as const,
  detail: (id: number) => [...translatorKeys.all, 'detail', id] as const,
}

export function useTranslatorList(
  page: number,
  limit: number,
  search?: string,
) {
  return useQuery<PaginatedTranslatorResponse>({
    queryKey: translatorKeys.list(page, limit, search),
    queryFn: () => getTranslators(page, limit, search),
  })
}

export function useCreateTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTranslatorPayload) => createTranslator(data),
    onSuccess: (translator) => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator "${translator.name}" created`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create translator',
      )
    },
  })
}

export function useTranslator(id: number) {
  return useQuery<TranslatorResponse>({
    queryKey: translatorKeys.detail(id),
    queryFn: () => getTranslator(id),
    enabled: !!id,
  })
}

export function useUpdateTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateTranslatorPayload
    }) => updateTranslator(id, data),
    onSuccess: (translator) => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator "${translator.name}" updated`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update translator',
      )
    },
  })
}

export function useDeleteTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTranslator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator deleted`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete translator',
      )
    },
  })
}
```

---

### Task 6: Frontend — Dialogs + Admin route + Sidebar
**Skills:** `shadcn`, `tanstack-router-best-practices`

**Files:**
- Create: `frontend/src/components/translator/AddTranslatorDialog.tsx`
- Create: `frontend/src/components/translator/EditTranslatorDialog.tsx`
- Create: `frontend/src/routes/admin/translators.tsx`
- Modify: `frontend/src/components/AdminSidebar.tsx`

- [ ] **Step 1: Create AddTranslatorDialog.tsx** (with name + note textarea)

```typescript
import { useState } from 'react'
import { useCreateTranslator } from '#/hooks/useTranslators'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const AddTranslatorDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const createMutation = useCreateTranslator()

  const handleSave = () => {
    if (!name.trim() || createMutation.isPending) return
    createMutation.mutate(
      { name: name.trim(), note: note.trim() || undefined },
      {
        onSuccess: () => {
          setName('')
          setNote('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Translator</DialogTitle>
          <DialogDescription>
            Enter the name and optional note for the new translator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Translator name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <Textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddTranslatorDialog
```

- [ ] **Step 2: Create EditTranslatorDialog.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useUpdateTranslator } from '#/hooks/useTranslators'
import type { TranslatorResponse } from '#/services/api/translatorApi'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const EditTranslatorDialog = ({
  translator,
  onClose,
}: {
  translator: TranslatorResponse | null
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const updateMutation = useUpdateTranslator()

  useEffect(() => {
    if (translator) {
      setName(translator.name)
      setNote(translator.note ?? '')
    }
  }, [translator])

  const handleSave = () => {
    if (!translator || !name.trim() || updateMutation.isPending) return
    updateMutation.mutate(
      {
        id: translator.id,
        data: { name: name.trim(), note: note.trim() || undefined },
      },
      {
        onSuccess: () => {
          setName('')
          setNote('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={!!translator}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Translator</DialogTitle>
          <DialogDescription>
            Update the translator's name and note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Translator name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <Textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTranslatorDialog
```

- [ ] **Step 3: Create admin route at `frontend/src/routes/admin/translators.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslatorList, useDeleteTranslator } from '#/hooks/useTranslators'
import { useDebounce } from '#/hooks/useDebounce'
import type { TranslatorResponse } from '#/services/api/translatorApi'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Card, CardContent } from '#/components/ui/card'
import { Pencil, Plus, Trash2, Languages } from 'lucide-react'
import AddTranslatorDialog from '#/components/translator/AddTranslatorDialog'
import EditTranslatorDialog from '#/components/translator/EditTranslatorDialog'
import { Pagination } from '#/components/ui/pagination'

export const Route = createFileRoute('/admin/translators')({
  component: AdminTranslatorsPage,
})

function AdminTranslatorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [addOpen, setAddOpen] = useState(false)
  const [editTranslator, setEditTranslator] =
    useState<TranslatorResponse | null>(null)
  const [deleteTranslator, setDeleteTranslator] =
    useState<TranslatorResponse | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const deleteMutation = useDeleteTranslator()

  const { data, isLoading, isError } = useTranslatorList(
    page,
    pageSize,
    debouncedSearch || undefined,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Translators</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Translator
        </Button>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search translators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="mt-6 border-red-300 bg-red-50">
          <CardContent className="p-6 text-red-700">
            Failed to load translators. Make sure the backend is running.
          </CardContent>
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Languages />
            </EmptyMedia>
            <EmptyTitle>No Translators Found</EmptyTitle>
            <EmptyDescription>
              {debouncedSearch
                ? 'No translators match your search.'
                : 'No translators have been added yet.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Translator
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <div className="mt-6">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Note
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((translator) => (
                <TableRow key={translator.id}>
                  <TableCell className="font-medium">
                    {translator.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {translator.note ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditTranslator(translator)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTranslator(translator)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={data.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <AddTranslatorDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditTranslatorDialog
        translator={editTranslator}
        onClose={() => setEditTranslator(null)}
      />
      <DeleteConfirmDialog
        open={!!deleteTranslator}
        onOpenChange={(open) => {
          if (!open) setDeleteTranslator(null)
        }}
        title="Delete Translator"
        entityName={deleteTranslator?.name ?? ''}
        onConfirm={() => {
          if (!deleteTranslator) return
          deleteMutation.mutate(deleteTranslator.id, {
            onSuccess: () => setDeleteTranslator(null),
          })
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
```

- [ ] **Step 4: Modify AdminSidebar.tsx** — add "Translators" link under Manga section

Modify the `items` array in `frontend/src/components/AdminSidebar.tsx`:

Current:
```typescript
items: [
  {
    title: 'Manga List',
    url: '/admin/mangas',
  },
  {
    title: 'Create New',
    url: '/admin/mangas/new',
  },
  {
    title: 'Authors',
    url: '/admin/authors',
  },
  {
    title: 'Genres',
    url: '/admin/genres',
  },
],
```

Replace with:
```typescript
items: [
  {
    title: 'Manga List',
    url: '/admin/mangas',
  },
  {
    title: 'Create New',
    url: '/admin/mangas/new',
  },
  {
    title: 'Authors',
    url: '/admin/authors',
  },
  {
    title: 'Genres',
    url: '/admin/genres',
  },
  {
    title: 'Translators',
    url: '/admin/translators',
  },
],
```

- [ ] **Step 5: Generate routes**

Run: `cd frontend && npm run generate-routes`
Expected: routeTree.gen.ts updated with new `/admin/translators` route

---

### Verification

- [ ] Run backend unit tests: `cd backend && npm run test -- --testPathPattern=translator`
- [ ] Run backend e2e tests: `cd backend && npm run test:e2e -- --testPathPattern=translator`
- [ ] Run frontend lint: `cd frontend && npm run lint`
- [ ] Run frontend typecheck: `cd frontend && npm run check`
