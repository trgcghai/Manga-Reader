# MR114 — TrackingSource & TrackingConfig Entity Module

## Overview

Create the TypeORM entities, DTOs, and module structure for the manga tracking feature. This includes `TrackingSource` (external source URLs per manga), `TrackingConfig` (cronjob configuration), their DTOs, a repository, a lightweight service, a health-check controller, and module registration.

## Design Decisions

- Follow existing codebase conventions: composition-based repositories, class-validator + Swagger DTOs, feature module with `TypeOrmModule.forFeature`.
- The controller exposes a single `GET /tracking` endpoint returning `{ status: 'ok', module: 'tracking', timestamp }` to verify the module is active.
- The frequency enum is defined locally in the tracking module (consistent with other module-local enums in the codebase).
- No migration is created at this stage — `synchronize: true` in dev handles it.

## Files

### Entities

**`tracking-source.entity.ts`**
- `@PrimaryGeneratedColumn() id: number`
- `@ManyToOne(() => Manga, { onDelete: 'CASCADE' }) manga: Manga`
- `@Column() url: string`
- `@Column() name: string`
- `@Column({ nullable: true }) latestChapterNumber: string | null`
- `@CreateDateColumn() createdAt: Date`
- `@UpdateDateColumn() updatedAt: Date`
- `@Unique(['manga', 'name'])`, `@Unique(['manga', 'url'])`

**`tracking-config.entity.ts`**
- `@PrimaryGeneratedColumn() id: number`
- `@Column({ type: 'enum', enum: TrackingFrequency, default: TrackingFrequency.DAILY }) frequency: TrackingFrequency`
- `@Column({ type: 'int', default: 1 }) interval: number`
- `@Column() runAt: string` — HH:mm format
- `@UpdateDateColumn() updatedAt: Date`
- No `createdAt` as per spec (config is updated in-place)

### DTOs

**`tracking-source.dto.ts`**
- `CreateTrackingSourceDto`: `@IsInt() mangaId`, `@IsUrl() url`, `@IsString() name`
- `UpdateTrackingSourceDto`: optional `@IsUrl() url`, optional `@IsString() name`
- `TrackingSourceResponseDto`: all fields for API responses

**`tracking-config.dto.ts`**
- `UpdateTrackingConfigDto`: optional `@IsEnum(TrackingFrequency) frequency`, optional `@IsInt() @Min(1) interval`, optional `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/) runAt`
- `TrackingConfigResponseDto`: all fields

### Module

**`tracking.module.ts`** — `TypeOrmModule.forFeature([TrackingSource, TrackingConfig])`, registers controller, service, repository. Exports repository for future use.

### Repository

**`tracking.repository.ts`** — composition pattern with `@InjectRepository(TrackingSource)` and `@InjectRepository(TrackingConfig)`. Provides basic `find`, `create`, `update`, `delete` methods.

### Service

**`tracking.service.ts`** — lightweight. Returns module status.

### Controller

**`tracking.controller.ts`** — `@Controller('tracking')`, single `@Get()` handler returning `{ status: 'ok', module: 'tracking', timestamp: new Date().toISOString() }`.

### App Registration

Import `TrackingModule` in `backend/src/app.module.ts`.

## Out of Scope

- Tracking logic (cronjobs, actual URL fetching) — future batches
- Migration files — schema is managed via `synchronize` in dev
- Tests — will be in a follow-up batch
