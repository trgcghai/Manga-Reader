# MR03 PostgreSQL & TypeORM Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real PostgreSQL/TypeORM layer to the Nest backend, make `/health` report database reachability, and keep migrations and Docker Compose aligned with the same environment contract.

**Architecture:** Keep `AppModule` as the composition root and move new data-access concerns into a dedicated `database/` feature module. Put DB-aware health logic in a small `health/` feature module so the controller stays thin and the TypeORM CLI can share the same option builder as runtime. The existing root `AppController`/`AppService` stay in place so MR03 only refactors the backend structure where the new database concerns belong.

**Tech Stack:** NestJS 11, `@nestjs/typeorm`, TypeORM 0.3, `pg`, PostgreSQL 16, `ts-node`, Jest 30, Supertest 7.

---

## File structure

- `backend/src/app.module.ts` — composition root; imports `DatabaseModule` and `HealthModule`, keeps the root app controller/service.
- `backend/src/app.controller.ts` / `backend/src/app.service.ts` — existing root route; leave behavior unchanged.
- `backend/src/database/typeorm-options.ts` — pure helper that turns `process.env` into TypeORM options.
- `backend/src/database/data-source.ts` — shared CLI `DataSource` for migrations.
- `backend/src/database/data-source.spec.ts` — smoke test for the shared `DataSource` export.
- `backend/src/database/database.module.ts` — Nest module that registers TypeORM once and shares the connection.
- `backend/src/database/migrations/` — migration output directory for future schema changes.
- `backend/src/health/health.module.ts` — feature module for database-aware health checks.
- `backend/src/health/health.service.ts` — runs the `SELECT 1` ping and builds the health payload.
- `backend/src/health/health.controller.ts` — HTTP `/health` endpoint with dynamic status code.
- `backend/test/app.e2e-spec.ts` — HTTP-level tests for `/` and `/health`.
- `backend/src/database/typeorm-options.spec.ts` — unit tests for environment parsing and option building.
- `backend/src/health/health.service.spec.ts` — unit tests for the DB health logic.
- `backend/package.json` — add database dependencies and the TypeORM CLI script.
- `backend/README.md` — document env vars, pool config, and local Postgres usage.

---

### Task 1: Add TypeORM dependencies and the shared option builder

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/database/typeorm-options.ts`
- Test: `backend/src/database/typeorm-options.spec.ts`

- [ ] **Step 1: Add the database dependencies and TypeORM script**

Update `backend/package.json` to add:

```json
{
  "dependencies": {
    "@nestjs/typeorm": "^11.0.0",
    "pg": "^8.13.1",
    "typeorm": "^0.3.24"
  },
  "scripts": {
    "typeorm": "node --require ts-node/register ./node_modules/typeorm/cli.js -d src/database/data-source.ts"
  }
}
```

Then run:

```powershell
cd backend
npm install
```

Expected: `package-lock.json` updates and the new packages are installed.

- [ ] **Step 2: Write the failing helper test**

Create `backend/src/database/typeorm-options.spec.ts`:

```ts
import { buildTypeOrmOptions } from './typeorm-options';

describe('buildTypeOrmOptions', () => {
  it('uses DATABASE_URL when provided', () => {
    const options = buildTypeOrmOptions({
      DATABASE_URL: 'postgres://manga:manga@127.0.0.1:5432/manga_reader',
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgres://manga:manga@127.0.0.1:5432/manga_reader',
      synchronize: false,
      migrationsRun: false,
      extra: {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    });
  });

  it('falls back to POSTGRES_* variables', () => {
    const options = buildTypeOrmOptions({
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'manga',
      POSTGRES_PASSWORD: 'manga',
      POSTGRES_DB: 'manga_reader',
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      username: 'manga',
      password: 'manga',
      database: 'manga_reader',
    });
  });

  it('throws when the fallback env vars are missing', () => {
    expect(() => buildTypeOrmOptions({} as NodeJS.ProcessEnv)).toThrow(
      'Either DATABASE_URL or the POSTGRES_* variables must be set',
    );
  });
});
```

Run:

```powershell
npm test -- typeorm-options.spec.ts --runInBand
```

Expected: fail because `typeorm-options.ts` does not exist yet.

- [ ] **Step 3: Implement the shared option builder**

Create `backend/src/database/typeorm-options.ts`:

```ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const poolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

function toGlobPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function required(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('POSTGRES_PORT must be a valid TCP port number');
  }

  return port;
}

export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv,
): TypeOrmModuleOptions {
  const cwd = toGlobPath(process.cwd());
  const shared = {
    type: 'postgres' as const,
    entities: [`${cwd}/src/**/*.entity.ts`, `${cwd}/dist/**/*.entity.js`],
    migrations: [
      `${cwd}/src/database/migrations/*.ts`,
      `${cwd}/dist/database/migrations/*.js`,
    ],
    migrationsRun: false,
    synchronize: false,
    extra: poolConfig,
  };

  if (env.DATABASE_URL) {
    return {
      ...shared,
      url: env.DATABASE_URL,
    };
  }

  const host = required(
    env.POSTGRES_HOST,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const port = parsePort(env.POSTGRES_PORT);
  const username = required(
    env.POSTGRES_USER,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const password = required(
    env.POSTGRES_PASSWORD,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );
  const database = required(
    env.POSTGRES_DB,
    'Either DATABASE_URL or the POSTGRES_* variables must be set',
  );

  return {
    ...shared,
    host,
    port,
    username,
    password,
    database,
  };
}
```

- [ ] **Step 4: Run the helper test again**

Run:

```powershell
npm test -- typeorm-options.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/package.json backend/package-lock.json backend/src/database/typeorm-options.ts backend/src/database/typeorm-options.spec.ts
git commit -m "feat: add shared TypeORM option builder"
```

### Task 2: Add the DatabaseModule and shared DataSource

**Files:**
- Create: `backend/src/database/database.module.ts`
- Create: `backend/src/database/data-source.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/database/data-source.spec.ts`

- [ ] **Step 1: Write the failing module integration expectation**

Create `backend/src/database/data-source.spec.ts`:

```ts
describe('AppDataSource', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_PORT;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_DB;
  });

  it('exports a postgres data source built from DATABASE_URL', async () => {
    process.env.DATABASE_URL =
      'postgres://manga:manga@127.0.0.1:5432/manga_reader';

    const { AppDataSource } = await import('./data-source');

    expect(AppDataSource.options).toMatchObject({
      type: 'postgres',
      url: 'postgres://manga:manga@127.0.0.1:5432/manga_reader',
      synchronize: false,
      migrationsRun: false,
    });
  });
});
```

Run:

```powershell
npm test -- data-source.spec.ts --runInBand
```

Expected: fail because `./data-source` does not exist yet.

- [ ] **Step 2: Implement the database module and shared CLI data source**

Create `backend/src/database/database.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => buildTypeOrmOptions(process.env),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

Create `backend/src/database/data-source.ts`:

```ts
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

export const AppDataSource = new DataSource(buildTypeOrmOptions(process.env));

export default AppDataSource;
```

Update `backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Run the backend tests again**

Run:

```powershell
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add backend/src/app.module.ts backend/src/database/database.module.ts backend/src/database/data-source.ts
git commit -m "feat: add TypeORM database module"
```

### Task 3: Add the database-aware health module

**Files:**
- Create: `backend/src/health/health.module.ts`
- Create: `backend/src/health/health.service.ts`
- Create: `backend/src/health/health.controller.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/health/health.service.spec.ts`

- [ ] **Step 1: Write the failing health service test**

Create `backend/src/health/health.service.spec.ts`:

```ts
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports the database as up when SELECT 1 succeeds', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as { query: jest.MockedFunction<DataSource['query']> };

    const service = new HealthService(dataSource as unknown as DataSource);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: { status: 'up' },
    });
  });

  it('reports the database as down when SELECT 1 fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('database offline')),
    } as { query: jest.MockedFunction<DataSource['query']> };

    const service = new HealthService(dataSource as unknown as DataSource);

    await expect(service.check()).resolves.toEqual({
      status: 'degraded',
      database: { status: 'down', error: 'database offline' },
    });
  });
});
```

Run:

```powershell
npm test -- health.service.spec.ts --runInBand
```

Expected: fail because `./health.service` does not exist yet.

- [ ] **Step 2: Implement the health module, service, and controller**

Create `backend/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

Create `backend/src/health/health.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type HealthStatus =
  | {
      status: 'ok';
      database: { status: 'up' };
    }
  | {
      status: 'degraded';
      database: { status: 'down'; error: string };
    };

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: { status: 'up' },
      };
    } catch (error: unknown) {
      return {
        status: 'degraded',
        database: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown database error',
        },
      };
    }
  }
}
```

Create `backend/src/health/health.controller.ts`:

```ts
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReturnType<HealthService['check']>> {
    const health = await this.healthService.check();

    response.status(
      health.database.status === 'up'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return health;
  }
}
```

Update `backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DatabaseModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Run the health service test again**

Run:

```powershell
npm test -- health.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add backend/src/health/health.module.ts backend/src/health/health.service.ts backend/src/health/health.controller.ts backend/src/health/health.service.spec.ts
git commit -m "feat: add database health check"
```

### Task 4: Update the HTTP e2e coverage and package scripts

**Files:**
- Modify: `backend/test/app.e2e-spec.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Write the e2e expectations for `/` and `/health`**

Replace `backend/test/app.e2e-spec.ts` with:

```ts
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { HealthModule } from '../src/health/health.module';

describe('Backend HTTP surface (e2e)', () => {
  let app: INestApplication;
  const mockDataSource = {
    query: jest.fn(),
  } as { query: jest.MockedFunction<DataSource['query']> };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockDataSource.query.mockReset();
  });

  it('GET / returns the starter greeting', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('GET /health returns ok when the database responds', () => {
    mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        database: { status: 'up' },
      });
  });

  it('GET /health returns 503 when the database is unavailable', () => {
    mockDataSource.query.mockRejectedValue(new Error('database offline'));

    return request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect({
        status: 'degraded',
        database: { status: 'down', error: 'database offline' },
      });
  });
});
```

Run:

```powershell
npm test -- app.e2e-spec.ts --runInBand
```

Expected: fail until the new health module is in place and wired correctly.

- [ ] **Step 2: Update the TypeORM CLI script**

Update `backend/package.json` so the migration command uses the shared data source:

```json
{
  "scripts": {
    "typeorm": "node --require ts-node/register ./node_modules/typeorm/cli.js -d src/database/data-source.ts"
  }
}
```

- [ ] **Step 3: Run the e2e test again**

Run:

```powershell
npm test -- app.e2e-spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add backend/test/app.e2e-spec.ts backend/package.json
git commit -m "test: cover database-aware health endpoint"
```

### Task 5: Document the connection contract and verify the backend against Postgres

**Files:**
- Modify: `backend/README.md`

- [ ] **Step 1: Add the env and pool documentation**

Update `backend/README.md` with a backend Postgres section like this:

```md
## PostgreSQL

The backend reads either `DATABASE_URL` or the individual `POSTGRES_*` variables.

```powershell
$env:DATABASE_URL = 'postgres://manga:manga@127.0.0.1:5432/manga_reader'
# or
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5432'
$env:POSTGRES_USER = 'manga'
$env:POSTGRES_PASSWORD = 'manga'
$env:POSTGRES_DB = 'manga_reader'
```

Connection pool settings:

- `max: 10`
- `idleTimeoutMillis: 30000`
- `connectionTimeoutMillis: 5000`
```

- [ ] **Step 2: Verify the backend starts against the Compose Postgres service**

Run:

```powershell
docker compose up postgres -d
$env:PORT = '3001'
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5432'
$env:POSTGRES_USER = 'manga'
$env:POSTGRES_PASSWORD = 'manga'
$env:POSTGRES_DB = 'manga_reader'
npm run start:dev
```

Expected: the backend boots without errors and logs that the PostgreSQL connection was established.

Then check:

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health | Select-Object -ExpandProperty Content
```

Expected:

```json
{"status":"ok","database":{"status":"up"}}
```

- [ ] **Step 3: Run the migration command**

Run:

```powershell
$env:DATABASE_URL = 'postgres://manga:manga@127.0.0.1:5432/manga_reader'
npm run typeorm migration:run
```

Expected: TypeORM connects to Postgres and exits with code 0; if no migrations exist yet, it reports that no migrations are pending.

- [ ] **Step 4: Run the backend test and lint pass**

Run:

```powershell
npm test -- --runInBand
npm run lint
npm run format
npm run build
```

Expected: all backend checks pass with the new database and health structure in place.

- [ ] **Step 5: Commit**

```powershell
git add backend/README.md
git commit -m "docs: document backend postgres setup"
```
