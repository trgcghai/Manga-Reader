# MR114 — TrackingSource & TrackingConfig Entity Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the TrackingSource and TrackingConfig entities, DTOs, repository, service, controller, and module registration for the manga tracking feature.

**Architecture:** Feature module under `backend/src/modules/tracking/` following existing NestJS patterns: composition-based repository, class-validator + Swagger DTOs, TypeOrmModule.forFeature registration, and a single GET health-check endpoint.

**Tech Stack:** NestJS, TypeORM, class-validator, class-transformer, @nestjs/swagger

**Related skills:** `nestjs-best-practices`, `nestjs-testing`, `vitest`

---

## File Structure

```
backend/src/modules/tracking/
├── constants/
│   └── tracking.constant.ts        # TrackingFrequency enum
├── entities/
│   ├── tracking-source.entity.ts   # TrackingSource entity
│   └── tracking-config.entity.ts   # TrackingConfig entity
├── dto/
│   ├── tracking-source.dto.ts      # Create/Update/Response DTOs
│   └── tracking-config.dto.ts      # Update/Response DTOs
├── tracking.repository.ts          # Composition-based repository
├── tracking.service.ts             # Lightweight service (GET health)
├── tracking.controller.ts          # GET /tracking endpoint
├── tracking.module.ts              # Module registration
```

**Modified files:**
- `backend/src/app.module.ts` — add `TrackingModule` import

---

### Task 1: Create TrackingFrequency enum

**Skill:** `nestjs-best-practices` (arch-feature-modules, constants organization)

**Files:**
- Create: `backend/src/modules/tracking/constants/tracking.constant.ts`

- [ ] **Step 1: Create the constant file**

```typescript
export enum TrackingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/constants/tracking.constant.ts
git commit -m "feat: add TrackingFrequency enum"
```

---

### Task 2: Create TrackingSource entity

**Skill:** `nestjs-best-practices` (db-orm, arch-feature-modules)

**Files:**
- Create: `backend/src/modules/tracking/entities/tracking-source.entity.ts`

- [ ] **Step 1: Create the TrackingSource entity**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, Unique,
} from 'typeorm';
import { Manga } from '../../manga/entities/manga.entity';

@Entity()
@Unique(['manga', 'name'])
@Unique(['manga', 'url'])
export class TrackingSource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Manga, { onDelete: 'CASCADE' })
  manga: Manga;

  @Column()
  url: string;

  @Column()
  name: string;

  @Column({ nullable: true, default: null })
  latestChapterNumber: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/entities/tracking-source.entity.ts
git commit -m "feat: add TrackingSource entity"
```

---

### Task 3: Create TrackingConfig entity

**Skill:** `nestjs-best-practices` (db-orm, arch-feature-modules)

**Files:**
- Create: `backend/src/modules/tracking/entities/tracking-config.entity.ts`

- [ ] **Step 1: Create the TrackingConfig entity**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';
import { TrackingFrequency } from '../constants/tracking.constant';

@Entity()
export class TrackingConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TrackingFrequency,
    default: TrackingFrequency.DAILY,
  })
  frequency: TrackingFrequency;

  @Column({ type: 'int', default: 1 })
  interval: number;

  @Column()
  runAt: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/entities/tracking-config.entity.ts
git commit -m "feat: add TrackingConfig entity"
```

---

### Task 4: Create TrackingSource DTOs

**Skill:** `nestjs-best-practices` (security-validate-all-input, api-use-dto-serialization)

**Files:**
- Create: `backend/src/modules/tracking/dto/tracking-source.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsOptional, IsString, IsUrl,
} from 'class-validator';

export class CreateTrackingSourceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  mangaId: number;

  @ApiProperty({ example: 'https://example.com/manga/one-piece' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'MangaDex' })
  @IsString()
  name: string;
}

export class UpdateTrackingSourceDto {
  @ApiPropertyOptional({ example: 'https://example.com/manga/one-piece' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'MangaDex' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class TrackingSourceResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  mangaId: number;

  @ApiProperty()
  url: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  latestChapterNumber: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/dto/tracking-source.dto.ts
git commit -m "feat: add TrackingSource DTOs"
```

---

### Task 5: Create TrackingConfig DTOs

**Skill:** `nestjs-best-practices` (security-validate-all-input, api-use-dto-serialization)

**Files:**
- Create: `backend/src/modules/tracking/dto/tracking-config.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { TrackingFrequency } from '../constants/tracking.constant';

export class UpdateTrackingConfigDto {
  @ApiPropertyOptional({ enum: TrackingFrequency, example: TrackingFrequency.DAILY })
  @IsOptional()
  @IsEnum(TrackingFrequency)
  frequency?: TrackingFrequency;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ example: '02:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'runAt must be in HH:mm format' })
  runAt?: string;
}

export class TrackingConfigResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: TrackingFrequency })
  frequency: TrackingFrequency;

  @ApiProperty()
  interval: number;

  @ApiProperty()
  runAt: string;

  @ApiProperty()
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/dto/tracking-config.dto.ts
git commit -m "feat: add TrackingConfig DTOs"
```

---

### Task 6: Create TrackingRepository

**Skill:** `nestjs-best-practices` (arch-use-repository-pattern)

**Files:**
- Create: `backend/src/modules/tracking/tracking.repository.ts`

- [ ] **Step 1: Create the repository**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';

@Injectable()
export class TrackingRepository {
  constructor(
    @InjectRepository(TrackingSource)
    private readonly sourceRepo: Repository<TrackingSource>,
    @InjectRepository(TrackingConfig)
    private readonly configRepo: Repository<TrackingConfig>,
  ) {}

  // ---- TrackingSource ----

  findAllSources = async (): Promise<TrackingSource[]> => {
    return await this.sourceRepo.find();
  };

  findSourceById = async (id: number): Promise<TrackingSource | null> => {
    return await this.sourceRepo.findOne({ where: { id } });
  };

  createSource = async (data: Partial<TrackingSource>): Promise<TrackingSource> => {
    return await this.sourceRepo.save(data);
  };

  updateSource = async (id: number, data: Partial<TrackingSource>): Promise<TrackingSource | null> => {
    const entity = await this.sourceRepo.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, data);
    return await this.sourceRepo.save(entity);
  };

  deleteSource = async (id: number): Promise<boolean> => {
    const result = await this.sourceRepo.delete(id);
    return (result.affected ?? 0) > 0;
  };

  // ---- TrackingConfig ----

  findConfig = async (): Promise<TrackingConfig | null> => {
    const configs = await this.configRepo.find({ take: 1 });
    return configs[0] ?? null;
  };

  upsertConfig = async (data: Partial<TrackingConfig>): Promise<TrackingConfig> => {
    const existing = await this.findConfig();
    if (existing) {
      Object.assign(existing, data);
      return await this.configRepo.save(existing);
    }
    return await this.configRepo.save(data as TrackingConfig);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/tracking.repository.ts
git commit -m "feat: add TrackingRepository"
```

---

### Task 7: Create TrackingService

**Skill:** `nestjs-best-practices` (arch-single-responsibility)

**Files:**
- Create: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class TrackingService {
  getStatus = (): { status: string; module: string; timestamp: string } => {
    return {
      status: 'ok',
      module: 'tracking',
      timestamp: new Date().toISOString(),
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add TrackingService with health status"
```

---

### Task 8: Create TrackingController

**Skill:** `nestjs-best-practices` (api-design)

**Files:**
- Create: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Check tracking module health' })
  @ApiOkResponse({ description: 'Module is active' })
  getStatus(): { status: string; module: string; timestamp: string } {
    return this.trackingService.getStatus();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.ts
git commit -m "feat: add TrackingController with GET /tracking"
```

---

### Task 9: Create TrackingModule

**Skill:** `nestjs-best-practices` (arch-feature-modules, arch-module-sharing)

**Files:**
- Create: `backend/src/modules/tracking/tracking.module.ts`

- [ ] **Step 1: Create the module**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingSource, TrackingConfig])],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/tracking/tracking.module.ts
git commit -m "feat: add TrackingModule with TypeORM registration"
```

---

### Task 10: Register TrackingModule in AppModule

**Skill:** `nestjs-best-practices` (arch-feature-modules)

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Read current app.module.ts to find import location**

```bash
cd backend && grep -n "imports" src/app.module.ts | head -5
```

- [ ] **Step 2: Add TrackingModule import**

Add this import at the top of `backend/src/app.module.ts`:
```typescript
import { TrackingModule } from './modules/tracking/tracking.module';
```

Add `TrackingModule` to the `imports` array in `@Module()`.

- [ ] **Step 3: Verify the module compiles**

```bash
cd backend && npx nest build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat: register TrackingModule in AppModule"
```

---

### Task 11: Verify with lint

**Skill:** `nestjs-best-practices` (devops-use-logging)

**Files:** None

- [ ] **Step 1: Run lint**

```bash
cd backend && npm run lint
```

Expected: No lint errors.

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
cd backend && npm run test
```

Expected: All existing tests pass.

---

## Self-Review Checklist

1. **Spec coverage:** All spec requirements covered — TrackingSource entity (Task 2), TrackingConfig entity (Task 3), DTOs (Tasks 4-5), module scaffold (Task 9), repository (Task 6), AppModule registration (Task 10). GET health endpoint (Task 7-8).
2. **Placeholder scan:** No TBD, TODO, or vague instructions. Every step has complete code.
3. **Type consistency:** `TrackingFrequency` enum defined in Task 1, used in Task 3 (entity) and Task 5 (DTOs). All method signatures match across files.
