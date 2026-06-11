# MR01 Backend Project Setup & Health Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Nest backend fail fast without `PORT`, add `GET /health`, keep the starter root route, and make the documented backend scripts and Docker build work cleanly.

**Architecture:** Keep the starter Nest app structure and add only one tiny bootstrap helper for required env parsing. `AppController` continues to own `/`, a dedicated `HealthController` owns `/health`, and the Docker image becomes a simple multi-stage build. Script cleanup stays minimal: only target real backend source files so `lint` and `format` do not break on missing globs.

**Tech Stack:** NestJS 11, TypeScript 5, Jest 30, ESLint 9, Prettier 3, Docker/Node 22.

---

## File structure

- `backend/src/bootstrap.ts` — pure helper that reads and validates `PORT`.
- `backend/src/main.ts` — Nest bootstrap that uses the required port and exits on startup failure.
- `backend/src/app.service.ts` — root greeting string for `GET /`.
- `backend/src/app.module.ts` — controller registration.
- `backend/src/health.controller.ts` — `GET /health` endpoint.
- `backend/src/bootstrap.spec.ts` — unit tests for required port parsing.
- `backend/src/health.controller.spec.ts` — unit test for health response.
- `backend/src/app.controller.spec.ts` — existing root-route test; keep it passing.
- `backend/package.json` — tighten `lint` and `format` globs to actual backend source files.
- `backend/Dockerfile` — multi-stage build image.
- `backend/README.md` — note that `PORT` is required for direct local runs.

---

### Task 1: Rework bootstrap and root greeting

**Files:**
- Create: `backend/src/bootstrap.ts`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.service.ts`
- Modify: `backend/package.json`
- Test: `backend/src/bootstrap.spec.ts`
- Test: `backend/src/app.controller.spec.ts` (existing)

- [ ] **Step 1: Write the failing tests**

Create `backend/src/bootstrap.spec.ts`:

```ts
import { getRequiredPort } from './bootstrap';

describe('getRequiredPort', () => {
  it('throws when PORT is missing', () => {
    expect(() => getRequiredPort({} as NodeJS.ProcessEnv)).toThrow(
      'PORT environment variable is required',
    );
  });

  it('throws when PORT is not a valid TCP port', () => {
    expect(() =>
      getRequiredPort({ PORT: 'abc' } as NodeJS.ProcessEnv),
    ).toThrow('PORT must be a valid TCP port number');
  });

  it('returns the numeric port when PORT is valid', () => {
    expect(getRequiredPort({ PORT: '3001' } as NodeJS.ProcessEnv)).toBe(3001);
  });
});
```

Run:

```powershell
npm test -- bootstrap.spec.ts --runInBand
```

Expected: fail because `./bootstrap` does not exist yet.

Run the existing root-route test before changing the service:

```powershell
npm test -- app.controller.spec.ts --runInBand
```

Expected: fail because `AppService.getHello()` currently returns `"Hello World! Welcome to Manga Reader"` instead of the starter greeting expected by the test.

- [ ] **Step 2: Tighten the backend scripts**

Update `backend/package.json` so `lint` and `format` only target the real source tree:

```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

This removes the dead `apps`, `libs`, and `test` globs that are not present in the backend workspace.

- [ ] **Step 3: Implement the helper and bootstrap changes**

Create `backend/src/bootstrap.ts`:

```ts
export function getRequiredPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.PORT;

  if (!rawPort) {
    throw new Error('PORT environment variable is required');
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number');
  }

  return port;
}
```

Update `backend/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRequiredPort } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = getRequiredPort(process.env);
  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
```

Update `backend/src/app.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

- [ ] **Step 4: Run the focused tests again**

Run:

```powershell
npm test -- bootstrap.spec.ts app.controller.spec.ts --runInBand
```

Expected: both tests pass.

Run:

```powershell
$env:PORT = '3001'; npm run start:dev
```

Expected: backend starts on port `3001` with no startup error.

- [ ] **Step 5: Commit**

```powershell
git add backend/package.json backend/src/bootstrap.ts backend/src/main.ts backend/src/app.service.ts backend/src/bootstrap.spec.ts
git commit -m "fix: require port for backend bootstrap"
```

### Task 2: Add the health endpoint

**Files:**
- Create: `backend/src/health.controller.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/health.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/health.controller.spec.ts`:

```ts
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
```

Run:

```powershell
npm test -- health.controller.spec.ts --runInBand
```

Expected: fail because `./health.controller` does not exist yet.

- [ ] **Step 2: Implement the controller and register it**

Create `backend/src/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
```

Update `backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Run the controller test again**

Run:

```powershell
npm test -- health.controller.spec.ts --runInBand
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add backend/src/app.module.ts backend/src/health.controller.ts backend/src/health.controller.spec.ts
git commit -m "feat: add backend health endpoint"
```

### Task 3: Refresh Docker and local-run docs

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `backend/README.md`

- [ ] **Step 1: Replace the single-stage Dockerfile with a multi-stage build**

Update `backend/Dockerfile` to:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Document the required PORT env var**

Update `backend/README.md` in the compile/run section with a short note:

```md
> `PORT` is required for direct local runs. `docker compose up --build` already sets `PORT=3001` for the backend service.

```powershell
$env:PORT = '3001'
npm run start:dev
```
```

- [ ] **Step 3: Build the backend image**

Run:

```powershell
docker build -t backend .
```

Expected: build succeeds and produces a runnable image.

- [ ] **Step 4: Commit**

```powershell
git add backend/Dockerfile backend/README.md
git commit -m "chore: modernize backend docker build"
```

### Task 4: Full backend verification

**Files:**
- None

- [ ] **Step 1: Run the backend test suite**

Run:

```powershell
npm test -- --runInBand
```

Expected: all backend Jest tests pass.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: zero warnings or errors.

- [ ] **Step 3: Run format**

Run:

```powershell
npm run format
```

Expected: Prettier rewrites nothing after the code is already formatted.

- [ ] **Step 4: Smoke-test the running app**

Run in one shell:

```powershell
$env:PORT = '3001'; npm run start:dev
```

Then in another shell:

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health | Select-Object -ExpandProperty Content
```

Expected:

```json
{"status":"ok"}
```

- [ ] **Step 5: Verify the image build again**

Run:

```powershell
docker build -t backend .
```

Expected: succeeds after all source changes are in place.

- [ ] **Step 6: Check the working tree**

Run:

```powershell
git status --short
```

Expected: only the intended MR01 files are modified, with no stray formatting or generated files left behind.

