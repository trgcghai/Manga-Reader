# Manga CRUD Edit and Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PATCH and DELETE endpoints for manga, a dedicated edit page, and delete-with-confirmation on the list view.

**Architecture:** New `UpdateMangaDto` with all-optional fields; repository gets `update`, `delete`, and `findOneByIdWithRelations` methods; service handles author/genre resolution for updates. Frontend adds a route at `/admin/mangas/$id/edit`, reuses the create-form pattern. Delete uses shadcn Dialog. All backend changes TDD with thorough whitebox tests.

**Tech Stack:** NestJS, TypeORM, class-validator, TanStack Router, TanStack Query, shadcn Dialog

---

### Task 1: Backend — UpdateMangaDto

**Files:**
- Create: `backend/src/modules/manga/dto/update-manga.dto.ts`
- Test: `backend/src/modules/manga/dto/update-manga.dto.spec.ts`
- Modify: `backend/src/modules/manga/dto/manga.dto.ts` (no changes — separate file)

- [ ] **Step 1: Write the failing test for UpdateMangaDto validation**

```typescript
import { validate } from 'class-validator';
import { UpdateMangaDto } from './update-manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';

describe('UpdateMangaDto', () => {
  it('should pass with empty object (all fields optional)', async () => {
    const dto = new UpdateMangaDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with partial fields', async () => {
    const dto = new UpdateMangaDto();
    dto.title = 'Updated Title';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with all fields', async () => {
    const dto = new UpdateMangaDto();
    dto.title = 'Updated';
    dto.status = MangaStatus.COMPLETED;
    dto.description = 'New desc';
    dto.alternativeTitles = ['Alt1'];
    dto.coverPath = '/new/cover.jpg';
    dto.authors = ['Author1'];
    dto.genres = ['Genre1'];
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid status enum', async () => {
    const dto = new UpdateMangaDto();
    (dto as any).status = 'invalid_status';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('should reject empty title string', async () => {
    const dto = new UpdateMangaDto();
    dto.title = '';
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should reject non-string items in authors array', async () => {
    const dto = new UpdateMangaDto();
    (dto as any).authors = [123];
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'authors')).toBe(true);
  });

  it('should accept empty array for authors', async () => {
    const dto = new UpdateMangaDto();
    dto.authors = [];
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

Run: `cd backend && npm run test -- --testPathPattern=update-manga.dto.spec`
Expected: FAIL — module not found.

- [ ] **Step 2: Create UpdateMangaDto**

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
  IsString as IsStringArray,
} from 'class-validator';
import { MangaStatus } from 'src/common/constants/manga.constant';

export class UpdateMangaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsEnum(MangaStatus)
  status?: MangaStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsStringArray({ each: true })
  alternativeTitles?: string[];

  @IsOptional()
  @IsString()
  coverPath?: string;

  @IsOptional()
  @IsArray()
  @IsStringArray({ each: true })
  authors?: string[];

  @IsOptional()
  @IsArray()
  @IsStringArray({ each: true })
  genres?: string[];
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npm run test -- --testPathPattern=update-manga.dto.spec`
Expected: PASS (7 tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/dto/update-manga.dto.ts backend/src/modules/manga/dto/update-manga.dto.spec.ts
git commit -m "feat(backend): add UpdateMangaDto with all-optional fields"
```

---

### Task 2: Backend — Repository update/delete/findOneByIdWithRelations

**Files:**
- Modify: `backend/src/modules/manga/manga.repository.ts`
- Test: `backend/src/modules/manga/manga.repository.spec.ts`

- [ ] **Step 1: Write failing tests for repository methods**

```typescript
import { MangaRepository } from './manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';

describe('MangaRepository', () => {
  let repo: MangaRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    repo = new MangaRepository(mockRepo as any);
    jest.clearAllMocks();
  });

  describe('findOneByIdWithRelations', () => {
    it('should find manga with authors and genres relations', async () => {
      const expected = { id: 1, title: 'Test', authors: [], genres: [] } as Manga;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findOneByIdWithRelations(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findOneByIdWithRelations(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should preload and save manga', async () => {
      const partial = { title: 'Updated' };
      const preloaded = { id: 1, title: 'Original' } as Manga;
      const saved = { id: 1, title: 'Updated' } as Manga;
      mockRepo.preload.mockResolvedValue(preloaded);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, partial);

      expect(mockRepo.preload).toHaveBeenCalledWith({ id: 1, ...partial });
      expect(mockRepo.save).toHaveBeenCalledWith(preloaded);
      expect(result).toEqual(saved);
    });

    it('should return null when preload returns null', async () => {
      mockRepo.preload.mockResolvedValue(null);
      const result = await repo.update(999, { title: 'Nope' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete and return true when affected > 0', async () => {
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
});
```

Run: `cd backend && npm run test -- --testPathPattern=manga.repository.spec`
Expected: FAIL — methods don't exist yet.

- [ ] **Step 2: Implement repository methods**

Add these methods to `backend/src/modules/manga/manga.repository.ts`:

```typescript
findOneByIdWithRelations = async (id: number): Promise<Manga | null> => {
  return await this.repo.findOne({
    where: { id },
    relations: ['authors', 'genres'],
  });
};

update = async (id: number, data: Partial<Manga>): Promise<Manga | null> => {
  const manga = await this.repo.preload({ id, ...data });
  if (!manga) return null;
  return await this.repo.save(manga);
};

delete = async (id: number): Promise<boolean> => {
  const result = await this.repo.delete(id);
  return (result.affected ?? 0) > 0;
};
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npm run test -- --testPathPattern=manga.repository.spec`
Expected: PASS (6 tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/manga.repository.ts backend/src/modules/manga/manga.repository.spec.ts
git commit -m "feat(backend): add update, delete, findOneByIdWithRelations to MangaRepository"
```

---

### Task 3: Backend — Service update and delete methods

**Files:**
- Modify: `backend/src/modules/manga/manga.service.ts`
- Test: `backend/src/modules/manga/manga.service.spec.ts`

- [ ] **Step 1: Write failing tests for service update and delete**

Add these test blocks inside the existing `describe('MangaService')` in `manga.service.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
// Add to mockMangaRepository:
const mockMangaRepository = {
  findAll: jest.fn(),
  findOneById: jest.fn(),
  findAllPaginated: jest.fn(),
  create: jest.fn(),
  findOneByIdWithRelations: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Add new describe blocks after the existing create block:

describe('update', () => {
  it('should update scalar fields successfully', async () => {
    const existingManga = {
      id: 1,
      title: 'Old Title',
      status: 'ongoing',
      authors: [],
      genres: [],
    } as Manga;
    const dto = { title: 'New Title', status: MangaStatus.COMPLETED } as UpdateMangaDto;
    const updatedManga = { ...existingManga, title: 'New Title', status: MangaStatus.COMPLETED } as Manga;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockMangaRepository.update.mockResolvedValue(updatedManga);

    const result = await service.update(1, dto);

    expect(result.title).toBe('New Title');
    expect(result.status).toBe(MangaStatus.COMPLETED);
    expect(mockMangaRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'New Title',
      status: MangaStatus.COMPLETED,
    }));
  });

  it('should update only a subset of fields', async () => {
    const existingManga = {
      id: 1,
      title: 'Original',
      status: 'ongoing',
      description: 'Orig desc',
      authors: [],
      genres: [],
    } as Manga;
    const dto = { description: 'Updated desc' } as UpdateMangaDto;
    const updatedManga = { ...existingManga, description: 'Updated desc' } as Manga;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockMangaRepository.update.mockResolvedValue(updatedManga);

    const result = await service.update(1, dto);

    expect(result.description).toBe('Updated desc');
    expect(result.title).toBe('Original');
  });

  it('should replace authors list when provided', async () => {
    const existingManga = {
      id: 1,
      title: 'Test',
      authors: [{ id: 1, name: 'Old Author' }],
      genres: [],
    } as unknown as Manga;
    const dto = { authors: ['New Author'] } as UpdateMangaDto;
    const newAuthor = { id: 2, name: 'New Author' } as Author;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockAuthorRepo.findOneByName.mockResolvedValue(null);
    mockAuthorRepo.create.mockResolvedValue(newAuthor);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, authors: [newAuthor] });

    const result = await service.update(1, dto);

    expect(mockAuthorRepo.findOneByName).toHaveBeenCalledWith('New Author');
    expect(mockAuthorRepo.create).toHaveBeenCalledWith({ name: 'New Author' });
    expect(mockMangaRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
      authors: [newAuthor],
    }));
  });

  it('should replace genres list when provided', async () => {
    const existingManga = {
      id: 1,
      title: 'Test',
      authors: [],
      genres: [{ id: 1, name: 'Old Genre' }],
    } as unknown as Manga;
    const dto = { genres: ['New Genre'] } as UpdateMangaDto;
    const newGenre = { id: 2, name: 'New Genre' } as Genre;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockGenreRepo.findOneByName.mockResolvedValue(null);
    mockGenreRepo.create.mockResolvedValue(newGenre);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, genres: [newGenre] });

    const result = await service.update(1, dto);

    expect(mockGenreRepo.findOneByName).toHaveBeenCalledWith('New Genre');
    expect(mockGenreRepo.create).toHaveBeenCalledWith({ name: 'New Genre' });
    expect(mockMangaRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
      genres: [newGenre],
    }));
  });

  it('should leave existing authors/genres when not provided in dto', async () => {
    const existingManga = {
      id: 1,
      title: 'Test',
      authors: [{ id: 1, name: 'Existing Author' }],
      genres: [{ id: 1, name: 'Existing Genre' }],
    } as unknown as Manga;
    const dto = { title: 'Updated' } as UpdateMangaDto;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, title: 'Updated' });

    await service.update(1, dto);

    expect(mockAuthorRepo.findOneByName).not.toHaveBeenCalled();
    expect(mockGenreRepo.findOneByName).not.toHaveBeenCalled();
    expect(mockMangaRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Updated',
    }));
  });

  it('should create new author entities from new names', async () => {
    const existingManga = {
      id: 1, title: 'Test', authors: [], genres: [],
    } as unknown as Manga;
    const dto = { authors: ['Author A', 'Author B'] } as UpdateMangaDto;
    const authorA = { id: 1, name: 'Author A' } as Author;
    const authorB = { id: 2, name: 'Author B' } as Author;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockAuthorRepo.findOneByName.mockResolvedValueOnce(null);
    mockAuthorRepo.create.mockResolvedValueOnce(authorA);
    mockAuthorRepo.findOneByName.mockResolvedValueOnce(null);
    mockAuthorRepo.create.mockResolvedValueOnce(authorB);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, authors: [authorA, authorB] });

    const result = await service.update(1, dto);

    expect(mockAuthorRepo.create).toHaveBeenCalledTimes(2);
    expect(result.authors).toHaveLength(2);
  });

  it('should reuse existing authors by name', async () => {
    const existingManga = {
      id: 1, title: 'Test', authors: [], genres: [],
    } as unknown as Manga;
    const dto = { authors: ['Existing Author'] } as UpdateMangaDto;
    const author = { id: 5, name: 'Existing Author' } as Author;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockAuthorRepo.findOneByName.mockResolvedValue(author);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, authors: [author] });

    await service.update(1, dto);

    expect(mockAuthorRepo.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when manga does not exist', async () => {
    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(null);

    await expect(service.update(999, { title: 'Nope' } as UpdateMangaDto))
      .rejects.toThrow(NotFoundException);
  });

  it('should handle empty authors array (clear relations)', async () => {
    const existingManga = {
      id: 1, title: 'Test', authors: [{ id: 1, name: 'Old' }], genres: [],
    } as unknown as Manga;
    const dto = { authors: [] } as UpdateMangaDto;

    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);
    mockMangaRepository.update.mockResolvedValue({ ...existingManga, authors: [] });

    const result = await service.update(1, dto);

    expect(mockMangaRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
      authors: [],
    }));
    expect(result.authors).toEqual([]);
  });

  it('should throw BadRequestException when no updatable fields provided', async () => {
    const existingManga = { id: 1, title: 'Test', authors: [], genres: [] } as Manga;
    mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(existingManga);

    await expect(service.update(1, {} as UpdateMangaDto))
      .rejects.toThrow(BadRequestException);
  });
});

describe('delete', () => {
  it('should delete existing manga successfully', async () => {
    mockMangaRepository.findOneById.mockResolvedValue({ id: 1 } as Manga);
    mockMangaRepository.delete.mockResolvedValue(true);

    await service.delete(1);

    expect(mockMangaRepository.findOneById).toHaveBeenCalledWith(1);
    expect(mockMangaRepository.delete).toHaveBeenCalledWith(1);
  });

  it('should throw NotFoundException when manga does not exist', async () => {
    mockMangaRepository.findOneById.mockResolvedValue(null);

    await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    expect(mockMangaRepository.delete).not.toHaveBeenCalled();
  });
});
```

Also add the import:
```typescript
import { UpdateMangaDto } from 'src/modules/manga/dto/update-manga.dto';
```

Run: `cd backend && npm run test -- --testPathPattern=manga.service.spec`
Expected: FAIL — service methods don't exist yet.

- [ ] **Step 2: Implement service update and delete methods**

Add these methods to `backend/src/modules/manga/manga.service.ts`:

```typescript
import { UpdateMangaDto } from 'src/modules/manga/dto/update-manga.dto';

update = async (id: number, dto: UpdateMangaDto): Promise<Manga> => {
  try {
    const existing = await this.mangaRepository.findOneByIdWithRelations(id);
    if (!existing) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }

    const updateData: Partial<Manga> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.alternativeTitles !== undefined) updateData.alternativeTitles = dto.alternativeTitles;
    if (dto.coverPath !== undefined) updateData.coverPath = dto.coverPath;

    if (dto.authors !== undefined) {
      const authors = await Promise.all(
        dto.authors.map(async (name) => {
          let author = await this.authorRepository.findOneByName(name);
          if (!author) {
            author = await this.authorRepository.create({ name });
          }
          return author;
        }),
      );
      updateData.authors = authors;
    }

    if (dto.genres !== undefined) {
      const genres = await Promise.all(
        dto.genres.map(async (name) => {
          let genre = await this.genreRepo.findOneByName(name);
          if (!genre) {
            genre = await this.genreRepo.create({ name });
          }
          return genre;
        }),
      );
      updateData.genres = genres;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    const updated = await this.mangaRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }
    return updated;
  } catch (error) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Failed to update manga: ${error}`);
  }
};

delete = async (id: number): Promise<void> => {
  try {
    const existing = await this.mangaRepository.findOneById(id);
    if (!existing) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }
    await this.mangaRepository.delete(id);
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new BadRequestException(`Failed to delete manga: ${error}`);
  }
};
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npm run test -- --testPathPattern=manga.service.spec`
Expected: PASS (all existing + ~15 new tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/manga.service.ts backend/src/modules/manga/manga.service.spec.ts
git commit -m "feat(backend): add update and delete methods to MangaService"
```

---

### Task 4: Backend — Controller PATCH and DELETE endpoints

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Test: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Write failing tests for controller update and delete**

Add to existing `manga.controller.spec.ts`:

```typescript
import { UpdateMangaDto } from 'src/modules/manga/dto/update-manga.dto';

// In the beforeEach mock service, add:
update: jest.fn(),
delete: jest.fn(),

// Add these describe blocks after the existing create block:

describe('update', () => {
  it('should update and return the manga', async () => {
    const dto: UpdateMangaDto = { title: 'Updated Title' };
    const updatedManga = { id: 1, title: 'Updated Title' } as Manga;
    service.update.mockResolvedValue(updatedManga);

    const result = await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith(1, dto);
    expect(result).toEqual(updatedManga);
  });

  it('should throw NotFoundException when manga not found', async () => {
    const dto: UpdateMangaDto = { title: 'Nope' };
    service.update.mockRejectedValue(
      new NotFoundException('Manga with ID 999 not found'),
    );

    await expect(controller.update('999', dto)).rejects.toThrow(NotFoundException);
  });
});

describe('delete', () => {
  it('should delete and return 204', async () => {
    service.delete.mockResolvedValue(undefined);

    const result = await controller.delete('1');

    expect(service.delete).toHaveBeenCalledWith(1);
    expect(result).toBeUndefined();
  });

  it('should throw NotFoundException when manga not found', async () => {
    service.delete.mockRejectedValue(
      new NotFoundException('Manga with ID 999 not found'),
    );

    await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
  });
});
```

Run: `cd backend && npm run test -- --testPathPattern=manga.controller.spec`
Expected: FAIL — update and delete don't exist on controller.

- [ ] **Step 2: Add controller endpoints**

Add to `backend/src/modules/manga/manga.controller.ts`:

```typescript
import { Patch, Delete } from '@nestjs/common';
import { UpdateMangaDto } from 'src/modules/manga/dto/update-manga.dto';

@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateMangaDto) {
  return this.mangaService.update(+id, dto);
}

@Delete(':id')
delete(@Param('id') id: string) {
  return this.mangaService.delete(+id);
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npm run test -- --testPathPattern=manga.controller.spec`
Expected: PASS (all tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat(backend): add PATCH and DELETE endpoints to MangaController"
```

---

### Task 5: Frontend — API client additions

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`

- [ ] **Step 1: Add getManga, updateManga, deleteManga to the API client**

```typescript
export type UpdateMangaPayload = Partial<CreateMangaPayload>

export async function getManga(id: number): Promise<MangaResponse> {
  const res = await axiosInstance.get<MangaResponse>(`/mangas/${id}`)
  return res.data
}

export async function updateManga(
  id: number,
  data: UpdateMangaPayload,
): Promise<MangaResponse> {
  const res = await axiosInstance.patch<MangaResponse>(`/mangas/${id}`, data)
  return res.data
}

export async function deleteManga(id: number): Promise<void> {
  await axiosInstance.delete(`/mangas/${id}`)
}
```

Add `UpdateMangaPayload` type export.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api/mangaApi.ts
git commit -m "feat(frontend): add getManga, updateManga, deleteManga API functions"
```

---

### Task 6: Frontend — React Query hooks

**Files:**
- Modify: `frontend/src/hooks/useManga.ts`

- [ ] **Step 1: Add useManga, useUpdateManga, useDeleteManga hooks**

```typescript
import {
  getManga,
  updateManga,
  deleteManga,
} from '#/services/api/mangaApi'
import type {
  UpdateMangaPayload,
} from '#/services/api/mangaApi'

const mangaKeys = {
  all: ['mangas'] as const,
  list: (page: number, limit: number) =>
    [...mangaKeys.all, 'list', page, limit] as const,
  detail: (id: number) => [...mangaKeys.all, 'detail', id] as const,
}

export function useManga(id: number) {
  return useQuery<MangaResponse>({
    queryKey: mangaKeys.detail(id),
    queryFn: () => getManga(id),
    enabled: !!id,
  })
}

export function useUpdateManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMangaPayload }) =>
      updateManga(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
  })
}

export function useDeleteManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteManga(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useManga.ts
git commit -m "feat(frontend): add useManga, useUpdateManga, useDeleteManga hooks"
```

---

### Task 7: Frontend — shadcn Dialog for delete confirmation

**Files:**
- Modify: `frontend/package.json` (auto-updated by shadcn)
- Create: `frontend/src/components/ui/dialog.tsx`

- [ ] **Step 1: Add shadcn dialog component**

Run: `cd frontend && npm run generate-routes` (check it works first), then:
`cd frontend && npx shadcn@latest add dialog`

Expected: Creates `frontend/src/components/ui/dialog.tsx` with Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/dialog.tsx
git commit -m "feat(frontend): add shadcn Dialog component"
```

---

### Task 8: Frontend — Edit page

**Files:**
- Create: `frontend/src/routes/admin/mangas/$id.edit.tsx`
- Modify: `frontend/src/routeTree.gen.ts` (auto-generated)

- [ ] **Step 1: Create edit page**

```typescript
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useManga, useUpdateManga } from '#/hooks/useManga'
import type { UpdateMangaPayload } from '#/services/api/mangaApi'
import { useState } from 'react'
import { Loader2, Plus, X, Save } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Field as UiField,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError as UiFieldError,
} from '#/components/ui/field'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

const mangaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string(),
  description: z.string(),
  alternativeTitles: z.array(z.string()),
  coverPath: z.string(),
  authors: z.array(z.string()).min(1, 'At least one author required'),
  genres: z.array(z.string()).min(1, 'At least one genre required'),
})

export const Route = createFileRoute('/admin/mangas/$id/edit')({
  component: EditMangaPage,
})

function EditMangaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: manga, isLoading, isError } = useManga(Number(id))
  const mutation = useUpdateManga()

  const [altInput, setAltInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [genreInput, setGenreInput] = useState('')

  const form = useForm({
    validators: {
      onSubmit: mangaSchema,
    },
    defaultValues: {
      title: manga?.title ?? '',
      status: manga?.status ?? 'ongoing',
      description: manga?.description ?? '',
      alternativeTitles: (manga?.alternativeTitles as string[]) ?? [],
      coverPath: manga?.coverPath ?? '',
      authors: manga?.authors?.map((a) => a.name) ?? [],
      genres: manga?.genres?.map((g) => g.name) ?? [],
    },
    onSubmit: async ({ value }) => {
      const payload: UpdateMangaPayload = {
        title: value.title,
        status: value.status,
        description: value.description || undefined,
        alternativeTitles:
          value.alternativeTitles.length > 0
            ? value.alternativeTitles
            : undefined,
        coverPath: value.coverPath || undefined,
        authors: value.authors,
        genres: value.genres,
      }
      mutation.mutate(
        { id: Number(id), data: payload },
        { onSuccess: () => navigate({ to: '/admin/mangas' }) },
      )
    },
  })

  function addTag(
    field: {
      state: { value: string[] }
      handleChange: (v: string[]) => void
    },
    input: string,
    setInput: (v: string) => void,
  ) {
    const trimmed = input.trim()
    if (trimmed && !field.state.value.includes(trimmed)) {
      field.handleChange([...field.state.value, trimmed])
    }
    setInput('')
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Edit Manga</h1>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !manga) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-6 text-red-700">
          Failed to load manga. It may not exist or the backend is unavailable.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Edit Manga</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="mt-6"
      >
        <FieldGroup>
          <form.Field name="title">
            {(field) => (
              <UiField data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="title" required>
                  Title
                </FieldLabel>
                <Input
                  id="title"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="One Piece"
                  aria-invalid={field.state.meta.errors.length > 0 || undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <UiFieldError errors={field.state.meta.errors} />
                )}
              </UiField>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </UiField>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="A story about..."
                  rows={3}
                />
              </UiField>
            )}
          </form.Field>

          <form.Field name="alternativeTitles">
            {(field) => {
              const titles = field.state.value
              return (
                <UiField>
                  <FieldLabel>Alternative Titles</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={altInput}
                      onChange={(e) => setAltInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, altInput, setAltInput))
                      }
                      placeholder="Type and press Enter"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, altInput, setAltInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {titles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {titles.map((t, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {t}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                titles.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          <form.Field name="coverPath">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="coverPath">Cover Path</FieldLabel>
                <Input
                  id="coverPath"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="/covers/one_piece.jpg"
                />
              </UiField>
            )}
          </form.Field>

          <form.Field name="authors">
            {(field) => {
              const authors = field.state.value
              return (
                <UiField data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>Authors</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={authorInput}
                      onChange={(e) => setAuthorInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, authorInput, setAuthorInput))
                      }
                      placeholder="Eiichiro Oda"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, authorInput, setAuthorInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                  {authors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {authors.map((a, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {a}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                authors.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          <form.Field name="genres">
            {(field) => {
              const genres = field.state.value
              return (
                <UiField data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>Genres</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, genreInput, setGenreInput))
                      }
                      placeholder="Action"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, genreInput, setGenreInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                  {genres.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {genres.map((g, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {g}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                genres.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          {mutation.isError && (
            <UiField data-invalid>
              <FieldDescription className="text-destructive">
                {(mutation.error as Error).message || 'Failed to update manga'}
              </FieldDescription>
            </UiField>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/admin/mangas' })}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            />
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Generate routes**

Run: `cd frontend && npm run generate-routes`
Expected: `routeTree.gen.ts` is updated with the new edit route.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/admin/mangas/\$id.edit.tsx frontend/src/routeTree.gen.ts
git commit -m "feat(frontend): add manga edit page at /admin/mangas/:id/edit"
```

---

### Task 9: Frontend — List page with Actions column and delete dialog

**Files:**
- Modify: `frontend/src/routes/admin/mangas/index.tsx`

- [ ] **Step 1: Update manga list page with Actions column and delete dialog**

Replace imports to add:
```typescript
import { useNavigate } from '@tanstack/react-router'
import { useDeleteManga } from '#/hooks/useManga'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
```

Replace the `columnHelper` columns array to add an Actions column:
```typescript
const columnHelper = createColumnHelper<MangaResponse>()

const columns = [
  // ... existing columns unchanged ...
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => <ActionsCell manga={info.row.original} />,
  }),
]
```

Add the `ActionsCell` component and delete dialog inside the component file:

```typescript
function ActionsCell({ manga }: { manga: MangaResponse }) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteManga()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="xs"
        onClick={() => navigate({ to: '/admin/mangas/$id/edit', params: { id: String(manga.id) } })}
      >
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Manga</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{manga.title}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate(manga.id, {
                  onSuccess: () => setOpen(false),
                })
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

Add `useState` to imports: `import { useState } from 'react'`

Also add `Loader2` to the lucide-react imports.

- [ ] **Step 2: Run format and lint**

Run: `cd frontend && npm run format && npm run lint`
Expected: No errors (route is auto-detected, file may need minor formatting fixes)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/admin/mangas/index.tsx
git commit -m "feat(frontend): add actions column with edit/delete on manga list"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && npm run test`
Expected: All tests pass.

- [ ] **Step 2: Run frontend lint and typecheck**

Run: `cd frontend && npm run check`
Expected: No errors.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final cleanup after MR12 implementation"
```
