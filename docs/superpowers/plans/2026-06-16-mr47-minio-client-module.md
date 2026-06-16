# MR47: Minio Client Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `@Global()` NestJS module that initializes a Minio S3 client from env vars and auto-creates the configured bucket on startup.

**Architecture:** A single `FileModule` with a `useFactory` provider (`'MINIO_CLIENT'`) that parses `MINIO_ENDPOINT` URL. Implements `OnModuleInit` to verify/create the configured bucket. Marked `@Global()` so any service can inject the client without importing the module.

**Tech Stack:** NestJS, `minio` npm package, `@nestjs/config`

---

### Task 1: Install `minio` package

**Files:**
- Modify: `backend/package.json` (via npm)

- [ ] **Step 1: Install the package**

Run: `cd backend && npm install minio`

Expected output: `+ minio@<version>` added to package.json and package-lock.json.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: install minio npm package"
```

---

### Task 2: Create `FileModule`

**Files:**
- Create: `backend/src/modules/file/file.module.ts`

- [ ] **Step 1: Create `backend/src/modules/file/` directory**

```bash
mkdir -p backend/src/modules/file
```

- [ ] **Step 2: Write `file.module.ts`**

```typescript
import { Global, Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT')!;
        const url = new URL(endpoint);
        return new Minio.Client({
          endPoint: url.hostname,
          port: parseInt(url.port) || 9000,
          useSSL: url.protocol === 'https:',
          accessKey: configService.get<string>('MINIO_ACCESS_KEY')!,
          secretKey: configService.get<string>('MINIO_SECRET_KEY')!,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MINIO_CLIENT],
})
export class FileModule implements OnModuleInit {
  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket, 'us-east-1');
    }
  }
}
```

- [ ] **Step 3: Register `FileModule` in `app.module.ts`**

Add to existing imports in `backend/src/app.module.ts`:

```typescript
import { FileModule } from './modules/file/file.module';

// Inside @Module({ imports: [
FileModule,
// after LanguageModule or at the end of imports
```

- [ ] **Step 4: Add `MINIO_*` vars to `backend/.env`**

Append to `backend/.env`:

```
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=manga-pages
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && npx nest build`

Expected: No TypeScript errors, build succeeds.

- [ ] **Step 6: Verify backend starts in Docker**

```bash
docker compose up --build -d backend
docker compose logs backend --tail 20
```

Expected: No Minio-related errors, bucket auto-creation log (if any) appears, app starts successfully.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/file/file.module.ts backend/src/app.module.ts backend/.env
git commit -m "feat: add Minio client module with bucket auto-creation"
```
