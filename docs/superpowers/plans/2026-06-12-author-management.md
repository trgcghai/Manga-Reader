# Author Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated CRUD for authors in the admin panel — list table with pagination, create/edit/delete via dialogs, all wired into the existing MangaModule.

**Architecture:** Backend adds AuthorController + AuthorService to existing MangaModule, extends AuthorRepository with paginated findAll (ILIKE search) and CRUD methods. Frontend adds a single `/admin/authors` page with inline dialogs. No new module, no manga form changes.

**Tech Stack:** NestJS + TypeORM (Postgres, QueryBuilder with loadRelationCountAndMap), TanStack Router, shadcn Dialog, React Query hooks.

---

## File Structure

### New files
- `backend/src/modules/manga/dto/create-author.dto.ts`
- `backend/src/modules/manga/dto/update-author.dto.ts`
- `backend/src/modules/manga/dto/create-author.dto.spec.ts`
- `backend/src/modules/manga/dto/update-author.dto.spec.ts`
- `backend/src/modules/manga/author.service.ts`
- `backend/src/modules/manga/author.service.spec.ts`
- `backend/src/modules/manga/author.controller.ts`
- `backend/src/modules/manga/author.controller.spec.ts`
- `backend/test/author.e2e-spec.ts`
- `frontend/src/services/api/authorApi.ts`
- `frontend/src/hooks/useAuthors.ts`
- `frontend/src/routes/admin/authors.tsx`

### Modified files
- `backend/src/modules/manga/entities/author.entity.ts` — add `mangaCount?: number`
- `backend/src/modules/manga/author.repository.ts` — add findAll, findOneById, update, delete
- `backend/src/modules/manga/author.repository.spec.ts` — add tests for new methods
- `backend/src/modules/manga/manga.module.ts` — register AuthorController + AuthorService
- `frontend/src/routeTree.gen.ts` — auto-generated via `npm run generate-routes`

---

### Task 1: Author entity — add mangaCount property

**Files:**
- Modify: `backend/src/modules/manga/entities/author.entity.ts`

- [ ] **Add mangaCount property**

```typescript
// Add after `mangas: Manga[];`
@ManyToMany(() => Manga, (manga) => manga.authors)
mangas: Manga[];

mangaCount?: number;
```

No test needed — this is a TypeScript hint property that TypeORM's `loadRelationCountAndMap` populates at runtime.

---

### Task 2: AuthorRepository — extend with findAll, findOneById, update, delete

**Files:**
- Modify: `backend/src/modules/manga/author.repository.ts`
- Modify: `backend/src/modules/manga/author.repository.spec.ts`

- [ ] **Write tests for findAll**

Add to `author.repository.spec.ts`:

```typescript
describe('findAll', () => {
  it('should return paginated authors without search', async () => {
    const authors = [
      { id: 1, name: 'Author A', mangaCount: 2 },
      { id: 2, name: 'Author B', mangaCount: 0 },
    ] as Author[];
    const count = 2;
    const mockQb = {
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([authors, count]),
    };
    mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

    const result = await repo.findAll(undefined, 1, 20);

    expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('author');
    expect(result.data).toEqual(authors);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should apply ILIKE search filter when search param provided', async () => {
    const authors = [{ id: 1, name: 'Matching Author', mangaCount: 1 }] as Author[];
    const mockQb = {
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([authors, 1]),
    };
    mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

    await repo.findAll('Matching', 1, 20);

    expect(mockQb.where).toHaveBeenCalledWith(
      'author.name ILIKE :search',
      { search: '%Matching%' },
    );
  });

  it('should calculate correct totalPages', async () => {
    const mockQb = {
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 25]),
    };
    mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

    const result = await repo.findAll(undefined, 2, 10);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(mockQb.skip).toHaveBeenCalledWith(10);
    expect(mockQb.take).toHaveBeenCalledWith(10);
  });
});
```

- [ ] **Run tests to verify they fail**

```bash
cd backend && npm run test -- --testPathPattern=author.repository
```
Expected: Tests fail because `findAll` is not yet implemented.

- [ ] **Implement findAll**

Replace `author.repository.ts` with:

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Repository } from 'typeorm';

export class AuthorRepository {
  constructor(
    @InjectRepository(Author)
    private readonly repo: Repository<Author>,
  ) {}

  findOneByName = async (name: string): Promise<Author | null> => {
    return await this.repo.findOne({
      where: { name: name.trim() },
    });
  };

  create = async (data: Partial<Author>): Promise<Author> => {
    return await this.repo.save(data);
  };

  findAll = async (
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Author[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.repo
      .createQueryBuilder('author')
      .loadRelationCountAndMap('author.mangaCount', 'author.mangas')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('author.name', 'ASC');

    if (search) {
      qb.where('author.name ILIKE :search', { search: `%${search}%` });
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

  findOneById = async (id: number): Promise<Author | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  update = async (id: number, data: Partial<Author>): Promise<Author | null> => {
    const author = await this.repo.findOne({ where: { id } });
    if (!author) return null;
    if (data.name !== undefined) author.name = data.name;
    return await this.repo.save(author);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
```

- [ ] **Run tests to verify they pass**

```bash
cd backend && npm run test -- --testPathPattern=author.repository
```
Expected: All tests pass.

- [ ] **Write tests for findOneById, update, delete**

Add to `author.repository.spec.ts`:

```typescript
describe('findOneById', () => {
  it('should find author by id', async () => {
    const expected = { id: 1, name: 'Test' } as Author;
    mockRepo.findOne.mockResolvedValue(expected);

    const result = await repo.findOneById(1);

    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(expected);
  });

  it('should return null when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    expect(await repo.findOneById(999)).toBeNull();
  });
});

describe('update', () => {
  it('should update author name', async () => {
    const existing = { id: 1, name: 'Old Name' } as Author;
    mockRepo.findOne.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue({ ...existing, name: 'New Name' });

    const result = await repo.update(1, { name: 'New Name' });

    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(existing.name).toBe('New Name');
    expect(mockRepo.save).toHaveBeenCalledWith(existing);
    expect(result!.name).toBe('New Name');
  });

  it('should return null when author not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    expect(await repo.update(999, { name: 'Nope' })).toBeNull();
  });
});

describe('delete', () => {
  it('should return true when deleted', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
    expect(await repo.delete(1)).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should return false when nothing deleted', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
    expect(await repo.delete(999)).toBe(false);
  });
});
```

- [ ] **Run tests to verify they pass**

```bash
cd backend && npm run test -- --testPathPattern=author.repository
```
Expected: All tests pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/entities/author.entity.ts backend/src/modules/manga/author.repository.ts backend/src/modules/manga/author.repository.spec.ts
git commit -m "feat: extend AuthorRepository with findAll/findOneById/update/delete"
```

---

### Task 3: Author DTOs — CreateAuthorDto, UpdateAuthorDto

**Files:**
- Create: `backend/src/modules/manga/dto/create-author.dto.ts`
- Create: `backend/src/modules/manga/dto/update-author.dto.spec.ts`
- Create: `backend/src/modules/manga/dto/create-author.dto.spec.ts`
- Create: `backend/src/modules/manga/dto/update-author.dto.spec.ts`


- [ ] **Create CreateAuthorDto**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

- [ ] **Create UpdateAuthorDto**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateAuthorDto {
  @IsString()
  @IsOptional()
  name?: string;
}
```

- [ ] **Write tests for CreateAuthorDto**

```typescript
import { validate } from 'class-validator';
import { CreateAuthorDto } from './create-author.dto';

describe('CreateAuthorDto', () => {
  it('should pass validation with valid name', async () => {
    const dto = new CreateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateAuthorDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Write tests for UpdateAuthorDto**

```typescript
import { validate } from 'class-validator';
import { UpdateAuthorDto } from './update-author.dto';

describe('UpdateAuthorDto', () => {
  it('should pass validation with valid name', async () => {
    const dto = new UpdateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with empty object', async () => {
    const dto = new UpdateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Run tests**

```bash
cd backend && npm run test -- --testPathPattern=create-author.dto
cd backend && npm run test -- --testPathPattern=update-author.dto
```
Expected: All pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/dto/create-author.dto.ts backend/src/modules/manga/dto/update-author.dto.ts
git commit -m "feat: add CreateAuthorDto and UpdateAuthorDto"
```

Wait, I should also add the spec test files. Let me redo this.

Actually, looking at the project pattern, the update-manga.dto.spec.ts already exists. Let me follow the same pattern. Let me also make the DTO spec files part of the commit.

---

### Task 3: Author DTOs (revised)

- [ ] **Create DTO files and test files**

Create `backend/src/modules/manga/dto/create-author.dto.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

Create `backend/src/modules/manga/dto/update-author.dto.ts`:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateAuthorDto {
  @IsString()
  @IsOptional()
  name?: string;
}
```

Create `backend/src/modules/manga/dto/create-author.dto.spec.ts`:

```typescript
import { validate } from 'class-validator';
import { CreateAuthorDto } from './create-author.dto';

describe('CreateAuthorDto', () => {
  it('should pass with valid name', async () => {
    const dto = new CreateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateAuthorDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when name is missing', async () => {
    const dto = new CreateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

Create `backend/src/modules/manga/dto/update-author.dto.spec.ts`:

```typescript
import { validate } from 'class-validator';
import { UpdateAuthorDto } from './update-author.dto';

describe('UpdateAuthorDto', () => {
  it('should pass with valid name', async () => {
    const dto = new UpdateAuthorDto();
    dto.name = 'Valid Name';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with empty object (all optional)', async () => {
    const dto = new UpdateAuthorDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Run tests**

```bash
cd backend && npm run test -- --testPathPattern=create-author.dto --testPathPattern=update-author.dto
```
Expected: All pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/dto/create-author.dto.ts backend/src/modules/manga/dto/update-author.dto.ts backend/src/modules/manga/dto/create-author.dto.spec.ts backend/src/modules/manga/dto/update-author.dto.spec.ts
git commit -m "feat: add CreateAuthorDto and UpdateAuthorDto with validation"
```

---

### Task 4: AuthorService

**Files:**
- Create: `backend/src/modules/manga/author.service.ts`
- Create: `backend/src/modules/manga/author.service.spec.ts`

- [ ] **Write service tests**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorService } from './author.service';
import { AuthorRepository } from './author.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Author } from 'src/modules/manga/entities/author.entity';

describe('AuthorService', () => {
  let service: AuthorService;
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
        AuthorService,
        { provide: AuthorRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(AuthorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated authors', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockRepo.findAll.mockResolvedValue(expected);
      expect(await service.findAll('search', 2, 10)).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith('search', 2, 10);
    });
  });

  describe('findOne', () => {
    it('should return author when found', async () => {
      const author = { id: 1, name: 'Test' } as Author;
      mockRepo.findOneById.mockResolvedValue(author);
      expect(await service.findOne(1)).toEqual(author);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new author', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 1, name: 'New Author' } as Author;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'New Author' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Author' });
    });

    it('should throw BadRequestException on duplicate name', async () => {
      mockRepo.findOneByName.mockResolvedValue({ id: 1, name: 'Existing' } as Author);
      await expect(service.create({ name: 'Existing' })).rejects.toThrow(BadRequestException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update author name', async () => {
      const existing = { id: 1, name: 'Old' } as Author;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(null);
      const updated = { id: 1, name: 'New' } as Author;
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'New' });

      expect(result).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New' });
    });

    it('should throw NotFoundException when author does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new name is taken', async () => {
      const existing = { id: 1, name: 'Old' } as Author;
      const taken = { id: 2, name: 'Taken' } as Author;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(taken);
      await expect(service.update(1, { name: 'Taken' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete existing author', async () => {
      mockRepo.findOneById.mockResolvedValue({ id: 1 } as Author);
      mockRepo.delete.mockResolvedValue(true);
      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when author does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd backend && npm run test -- --testPathPattern=author.service
```
Expected: FAIL — cannot find module `author.service`.

- [ ] **Create AuthorService**

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorRepository } from './author.repository';
import { CreateAuthorDto } from 'src/modules/manga/dto/create-author.dto';
import { UpdateAuthorDto } from 'src/modules/manga/dto/update-author.dto';

@Injectable()
export class AuthorService {
  constructor(private readonly authorRepository: AuthorRepository) {}

  findAll = async (search?: string, page?: number, limit?: number) => {
    return await this.authorRepository.findAll(search, page, limit);
  };

  findOne = async (id: number) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return author;
  };

  create = async (dto: CreateAuthorDto) => {
    const existing = await this.authorRepository.findOneByName(dto.name);
    if (existing) {
      throw new BadRequestException(`Author "${dto.name}" already exists`);
    }
    return await this.authorRepository.create({ name: dto.name });
  };

  update = async (id: number, dto: UpdateAuthorDto) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    if (dto.name && dto.name !== author.name) {
      const taken = await this.authorRepository.findOneByName(dto.name);
      if (taken) {
        throw new BadRequestException(`Author "${dto.name}" already exists`);
      }
    }

    const updated = await this.authorRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return updated;
  };

  delete = async (id: number) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    await this.authorRepository.delete(id);
  };
}
```

- [ ] **Run tests to verify they pass**

```bash
cd backend && npm run test -- --testPathPattern=author.service
```
Expected: All pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/author.service.ts backend/src/modules/manga/author.service.spec.ts
git commit -m "feat: add AuthorService with CRUD operations"
```

---

### Task 5: AuthorController

**Files:**
- Create: `backend/src/modules/manga/author.controller.ts`
- Create: `backend/src/modules/manga/author.controller.spec.ts`

- [ ] **Write controller tests**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorController } from './author.controller';
import { AuthorService } from './author.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAuthorDto } from 'src/modules/manga/dto/create-author.dto';
import { UpdateAuthorDto } from 'src/modules/manga/dto/update-author.dto';

describe('AuthorController', () => {
  let controller: AuthorController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorController],
      providers: [{ provide: AuthorService, useValue: mockService }],
    }).compile();
    controller = module.get(AuthorController);
  });

  describe('findAll', () => {
    it('should return paginated authors', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockService.findAll.mockResolvedValue(expected);
      const result = await controller.findAll('search', '2', '10');
      expect(mockService.findAll).toHaveBeenCalledWith('search', 2, 10);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return author by id', async () => {
      const author = { id: 1, name: 'Test' };
      mockService.findOne.mockResolvedValue(author);
      expect(await controller.findOne('1')).toEqual(author);
      expect(mockService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create author', async () => {
      const dto: CreateAuthorDto = { name: 'New Author' };
      const created = { id: 1, name: 'New Author' };
      mockService.create.mockResolvedValue(created);
      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on duplicate', async () => {
      mockService.create.mockRejectedValue(new BadRequestException());
      await expect(controller.create({ name: 'Duplicate' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update author', async () => {
      const dto: UpdateAuthorDto = { name: 'Updated' };
      const updated = { id: 1, name: 'Updated' };
      mockService.update.mockResolvedValue(updated);
      const result = await controller.update('1', dto);
      expect(mockService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException', async () => {
      mockService.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update('999', { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete author', async () => {
      mockService.delete.mockResolvedValue(undefined);
      await controller.delete('1');
      expect(mockService.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException', async () => {
      mockService.delete.mockRejectedValue(new NotFoundException());
      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd backend && npm run test -- --testPathPattern=author.controller
```
Expected: FAIL — cannot find module `author.controller`.

- [ ] **Create AuthorController**

```typescript
import {
  Controller, Get, Post, Body, Param, Query, Patch, Delete,
} from '@nestjs/common';
import { AuthorService } from './author.service';
import { CreateAuthorDto } from 'src/modules/manga/dto/create-author.dto';
import { UpdateAuthorDto } from 'src/modules/manga/dto/update-author.dto';

@Controller('authors')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post()
  create(@Body() dto: CreateAuthorDto) {
    return this.authorService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.authorService.findAll(search, parseInt(page), parseInt(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.authorService.update(+id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.authorService.delete(+id);
  }
}
```

- [ ] **Run tests to verify they pass**

```bash
cd backend && npm run test -- --testPathPattern=author.controller
```
Expected: All pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/author.controller.ts backend/src/modules/manga/author.controller.spec.ts
git commit -m "feat: add AuthorController with CRUD endpoints"
```

---

### Task 6: Module wiring — register AuthorController + AuthorService

**Files:**
- Modify: `backend/src/modules/manga/manga.module.ts`

- [ ] **Add imports and register providers/controllers**

```typescript
import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { GenreRepository } from 'src/modules/manga/genre.repository';
import { AuthorRepository } from 'src/modules/manga/author.repository';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Manga, Author, Genre])],
  controllers: [MangaController, AuthorController],
  providers: [
    MangaService, MangaRepository, AuthorRepository, GenreRepository, AuthorService,
  ],
  exports: [MangaRepository, AuthorRepository, GenreRepository],
})
export class MangaModule {}
```

- [ ] **Run all backend tests to verify nothing broke**

```bash
cd backend && npm run test
```
Expected: All tests pass.

- [ ] **Commit**

```bash
git add backend/src/modules/manga/manga.module.ts
git commit -m "feat: register AuthorController and AuthorService in MangaModule"
```

---

### Task 7: Author E2E tests

**Files:**
- Create: `backend/test/author.e2e-spec.ts`

- [ ] **Write e2e test**

```typescript
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { MangaModule } from '../src/modules/manga/manga.module';
import { Manga } from '../src/modules/manga/entities/manga.entity';
import { Author } from '../src/modules/manga/entities/author.entity';
import { Genre } from '../src/modules/manga/entities/genre.entity';
import { Chapter } from '../src/modules/chapter/entities/chapter.entity';
import { Translation } from '../src/modules/chapter/entities/translation.entity';
import { Translator } from '../src/modules/translator/entities/translator.entity';
import { Language } from '../src/modules/translator/entities/language.entity';

describe('Author CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

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
          entities: [Manga, Author, Genre, Chapter, Translation, Translator, Language],
          synchronize: true,
        }),
        MangaModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get(DataSource);
    await app.init();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE manga_authors, author CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /authors', () => {
    it('should create an author', async () => {
      const res = await request(app.getHttpServer())
        .post('/authors')
        .send({ name: 'Kentaro Miura' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Kentaro Miura');
    });

    it('should return 400 for duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/authors')
        .send({ name: 'Duplicate' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/authors')
        .send({ name: 'Duplicate' })
        .expect(400);
    });

    it('should return 400 for empty name', async () => {
      await request(app.getHttpServer())
        .post('/authors')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('GET /authors', () => {
    beforeEach(async () => {
      const repo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      await repo.save({ name: 'Author A' });
      await repo.save({ name: 'Author B' });
      await repo.save({ name: 'Another C' });
    });

    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/authors')
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
    });

    it('should filter by search', async () => {
      const res = await request(app.getHttpServer())
        .get('/authors?search=Author')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should respect page and limit params', async () => {
      const res = await request(app.getHttpServer())
        .get('/authors?page=1&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.totalPages).toBe(2);
    });
  });

  describe('GET /authors/:id', () => {
    it('should return author by id', async () => {
      const repo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      const saved = await repo.save({ name: 'Find Me' });

      const res = await request(app.getHttpServer())
        .get(`/authors/${saved.id}`)
        .expect(200);

      expect(res.body.name).toBe('Find Me');
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/authors/99999')
        .expect(404);
    });
  });

  describe('PATCH /authors/:id', () => {
    it('should update author name', async () => {
      const repo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      const saved = await repo.save({ name: 'Before' });

      const res = await request(app.getHttpServer())
        .patch(`/authors/${saved.id}`)
        .send({ name: 'After' })
        .expect(200);

      expect(res.body.name).toBe('After');
    });

    it('should return 400 when new name is taken', async () => {
      const repo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      await repo.save({ name: 'Taken' });
      const saved = await repo.save({ name: 'Original' });

      await request(app.getHttpServer())
        .patch(`/authors/${saved.id}`)
        .send({ name: 'Taken' })
        .expect(400);
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .patch('/authors/99999')
        .send({ name: 'Nope' })
        .expect(404);
    });
  });

  describe('DELETE /authors/:id', () => {
    it('should delete author', async () => {
      const repo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      const saved = await repo.save({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/authors/${saved.id}`)
        .expect(200);

      const check = await repo.findOne({ where: { id: saved.id } });
      expect(check).toBeNull();
    });

    it('should delete author linked to manga (auto-remove associations)', async () => {
      const authorRepo = app.get(getRepositoryToken(Author)) as Repository<Author>;
      const mangaRepo = app.get(getRepositoryToken(Manga)) as Repository<Manga>;
      const author = await authorRepo.save({ name: 'Linked Author' });
      await mangaRepo.save({
        title: 'Linked Manga',
        status: 'ongoing',
        alternativeTitles: ['Linked Manga'],
        authors: [author],
        genres: [],
      } as any);

      await request(app.getHttpServer())
        .delete(`/authors/${author.id}`)
        .expect(200);
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .delete('/authors/99999')
        .expect(404);
    });
  });
});
```

- [ ] **Run e2e tests**

```bash
cd backend && npm run test:e2e
```
Expected: All e2e tests pass (existing health test + new author tests).

- [ ] **Commit**

```bash
git add backend/test/author.e2e-spec.ts
git commit -m "test: add E2E tests for Author CRUD"
```

---

### Task 8: Frontend API client — authorApi.ts

**Files:**
- Create: `frontend/src/services/api/authorApi.ts`

- [ ] **Create author API client**

```typescript
import { api } from './api';

export interface AuthorResponse {
  id: number;
  name: string;
  mangaCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAuthorResponse {
  data: AuthorResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAuthorPayload {
  name: string;
}

export interface UpdateAuthorPayload {
  name?: string;
}

export async function getAuthors(
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<PaginatedAuthorResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);

  const { data } = await api.get<PaginatedAuthorResponse>(
    `/authors?${params.toString()}`,
  );
  return data;
}

export async function getAuthor(id: number): Promise<AuthorResponse> {
  const { data } = await api.get<AuthorResponse>(`/authors/${id}`);
  return data;
}

export async function createAuthor(
  payload: CreateAuthorPayload,
): Promise<AuthorResponse> {
  const { data } = await api.post<AuthorResponse>('/authors', payload);
  return data;
}

export async function updateAuthor(
  id: number,
  payload: UpdateAuthorPayload,
): Promise<AuthorResponse> {
  const { data } = await api.patch<AuthorResponse>(
    `/authors/${id}`,
    payload,
  );
  return data;
}

export async function deleteAuthor(id: number): Promise<void> {
  await api.delete(`/authors/${id}`);
}
```

No test needed for this file.

- [ ] **Commit**

```bash
git add frontend/src/services/api/authorApi.ts
git commit -m "feat: add author API client"
```

---

### Task 9: Frontend hooks — useAuthors.ts

**Files:**
- Create: `frontend/src/hooks/useAuthors.ts`

- [ ] **Create hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  CreateAuthorPayload,
  UpdateAuthorPayload,
} from '#/services/api/authorApi';

const authorKeys = {
  all: ['authors'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...authorKeys.all, 'list', page, limit, search] as const,
  detail: (id: number) => [...authorKeys.all, 'detail', id] as const,
};

export function useAuthorList(page: number, limit: number, search?: string) {
  return useQuery({
    queryKey: authorKeys.list(page, limit, search),
    queryFn: () => getAuthors(page, limit, search),
  });
}

export function useAuthor(id: number) {
  return useQuery({
    queryKey: authorKeys.detail(id),
    queryFn: () => getAuthor(id),
    enabled: !!id,
  });
}

export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAuthorPayload) => createAuthor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all });
    },
  });
}

export function useUpdateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAuthorPayload }) =>
      updateAuthor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all });
    },
  });
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAuthor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all });
    },
  });
}
```

- [ ] **Commit**

```bash
git add frontend/src/hooks/useAuthors.ts
git commit -m "feat: add useAuthors hooks"
```

---

### Task 10: Frontend author page — route, list table, add/edit/delete dialogs

**Files:**
- Create: `frontend/src/routes/admin/authors.tsx`
- Modify: `frontend/src/routeTree.gen.ts` (auto-generated)

- [ ] **Create author page**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuthorList, useCreateAuthor, useUpdateAuthor, useDeleteAuthor } from '#/hooks/useAuthors';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '#/components/ui/table';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '#/components/ui/dialog';
import { Skeleton } from '#/components/ui/skeleton';
import { Empty } from '#/components/ui/empty';
import { useDebounce } from '#/hooks/use-debounce';

export const Route = createFileRoute('/admin/authors')({
  component: AdminAuthorsPage,
});

function AddAuthorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState('');
  const createAuthor = useCreateAuthor();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createAuthor.mutateAsync({ name: name.trim() });
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Author</DialogTitle>
          <DialogDescription>Enter the author's name.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Author name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!name.trim() || createAuthor.isPending}>
            {createAuthor.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAuthorDialog({
  open,
  onOpenChange,
  author,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  author: { id: number; name: string } | null;
}) {
  const [name, setName] = useState('');
  const updateAuthor = useUpdateAuthor();

  useState(() => {
    if (author) setName(author.name);
  });

  const handleSubmit = async () => {
    if (!author || !name.trim()) return;
    await updateAuthor.mutateAsync({ id: author.id, data: { name: name.trim() } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Author</DialogTitle>
          <DialogDescription>Update the author's name.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Author name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!name.trim() || updateAuthor.isPending}>
            {updateAuthor.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAuthorDialog({
  open,
  onOpenChange,
  author,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  author: { id: number; name: string } | null;
}) {
  const deleteAuthor = useDeleteAuthor();

  const handleDelete = async () => {
    if (!author) return;
    await deleteAuthor.mutateAsync(author.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Author</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{author?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteAuthor.isPending}>
            {deleteAuthor.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminAuthorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 20;

  const { data, isLoading, isError } = useAuthorList(page, pageSize, debouncedSearch || undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [editAuthor, setEditAuthor] = useState<{ id: number; name: string } | null>(null);
  const [deleteAuthor, setDeleteAuthor] = useState<{ id: number; name: string } | null>(null);

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Empty title="Error loading authors" description="Could not fetch authors. Try again." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Authors</h1>
        <Button onClick={() => setAddOpen(true)}>Add Author</Button>
      </div>

      <Input
        placeholder="Search authors..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Mangas</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))
          ) : data?.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No authors found.
              </TableCell>
            </TableRow>
          ) : (
            data?.data.map((author) => (
              <TableRow key={author.id}>
                <TableCell className="font-medium">{author.name}</TableCell>
                <TableCell>{author.mangaCount ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditAuthor(author)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteAuthor(author)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <AddAuthorDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditAuthorDialog
        open={!!editAuthor}
        onOpenChange={() => setEditAuthor(null)}
        author={editAuthor}
      />
      <DeleteAuthorDialog
        open={!!deleteAuthor}
        onOpenChange={() => setDeleteAuthor(null)}
        author={deleteAuthor}
      />
    </div>
  );
}
```

- [ ] **Check if `use-debounce` hook exists**

```bash
ls frontend/src/hooks/
```
If it doesn't exist, create it or use a simple inline debounce.

- [ ] **Generate routes**

```bash
cd frontend && npm run generate-routes
```

- [ ] **Run frontend type check**

```bash
cd frontend && npm run check
```
Expected: No type errors.

- [ ] **Commit**

```bash
git add frontend/src/routes/admin/authors.tsx frontend/src/routeTree.gen.ts
git commit -m "feat: add admin author management page with dialogs"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every spec requirement has a task:
  - AuthorRepository findAll/findOneById/update/delete → Task 2
  - DTOs with validation → Task 3
  - AuthorService (create/update duplicate check, NotFoundException) → Task 4
  - AuthorController (5 endpoints) → Task 5
  - Module wiring → Task 6
  - E2E tests (POST/GET/PATCH/DELETE, duplicate, 404, search, pagination) → Task 7
  - Frontend API client → Task 8
  - Frontend hooks → Task 9
  - Frontend page (list table, add/edit/delete dialogs, search, pagination) → Task 10

- [ ] **Placeholder scan:** No "TBD", "TODO", or incomplete sections. All code blocks have complete implementations.

- [ ] **Type consistency:** 
  - `findAll` returns `{ data, total, page, limit, totalPages }` consistently across repository, service, controller, and frontend
  - `CreateAuthorDto` has `name: string` required
  - `UpdateAuthorDto` has `name?: string` optional
  - All method signatures match across layers
