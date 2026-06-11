# MR03 PostgreSQL & TypeORM Setup Design

## Context

The backend already has a NestJS app shell and a simple health endpoint. MR03 adds a real PostgreSQL integration on top of that shell using TypeORM, with configuration that works both from `DATABASE_URL` and from individual `POSTGRES_*` environment variables.

## Goals

- Add TypeORM and the PostgreSQL driver to the backend.
- Connect to PostgreSQL on startup using environment-driven configuration.
- Keep the app explicit about connection settings and pool behavior.
- Add a health check that reports database reachability.
- Set up migrations so `npm run typeorm migration:run` works.
- Make the backend work with the `postgres` service from `docker compose up postgres`.

## File structure

- `backend/src/app.module.ts` — composition root only; imports feature modules.
- `backend/src/database/database.module.ts` — owns TypeORM registration and exports shared DB wiring.
- `backend/src/database/typeorm-options.ts` — pure helper that maps env vars to TypeORM options.
- `backend/src/database/data-source.ts` — shared CLI data source for migrations.
- `backend/src/database/migrations/` — checked-in TypeORM migrations.
- `backend/src/health/health.module.ts` — groups the DB-aware health controller and service.
- `backend/src/health/health.controller.ts` — HTTP health endpoint.
- `backend/src/health/health.service.ts` — runs the database ping and builds the health payload.
- `backend/src/**/*.entity.ts` — feature-owned entities discovered by TypeORM.
- `backend/src/**/*.spec.ts` — colocated tests for the database helper and health layer.

## Non-goals

- No new business entities yet.
- No repository/service layer for manga data.
- No automatic schema sync in development.
- No frontend changes.

## Proposed structure

### Database configuration

Create a small `database/` feature module that owns all TypeORM wiring instead of inlining the connection in `AppModule`. The module will expose a shared helper that turns environment variables into TypeORM options and keep the runtime app and the TypeORM CLI aligned.

The configuration helper will support two modes:

1. `DATABASE_URL` present: use it directly.
2. `DATABASE_URL` absent: require `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

Connection pool settings should stay small and documented, with a conservative default pool size and explicit timeout values.

### TypeORM runtime and CLI

Use one shared `DataSource` export for migrations and one shared options helper for `TypeOrmModule.forRootAsync()`. That avoids the common drift where the runtime connection and the migration command point at different hosts or use different credentials.

Entity discovery should target `src/**/*.entity.ts` in development and the compiled `dist/**/*.entity.js` output in production.

### Health check

Keep the existing `/health` route but move it into a small `health/` feature module and make it database-aware. The endpoint should ask the database for a trivial `SELECT 1`-style check and return a richer payload:

- `200` with `{ status: 'ok', database: { status: 'up' } }` when the query succeeds.
- `503` with `{ status: 'degraded', database: { status: 'down', error: '...' } }` when the database check fails.

This keeps the endpoint useful without pretending the app is healthy when PostgreSQL is unreachable.

### App wiring

`AppModule` should import `DatabaseModule` and `HealthModule` only. No database or health providers should live directly in `AppModule`; it should remain the composition root.

### Migrations and scripts

Add a TypeORM CLI script in `backend/package.json` that points to the shared `data-source.ts` file so the documented command works:

- `npm run typeorm migration:run`

If a migration generation script is added, it should use the same data source file and output to a dedicated `src/database/migrations/` folder.

### Documentation

Update `backend/README.md` with the exact environment variable contract, example local connection settings for a host-run backend against `127.0.0.1:5432`, and the chosen pool configuration values.

## Error handling

- Missing database configuration should fail fast at startup.
- Invalid `POSTGRES_PORT` values should be rejected before the app tries to connect.
- The health endpoint should never hide a connection failure; it should report the database as down.
- The app should not use `synchronize: true`.

## Testing and verification

- Add unit tests for the environment-to-options helper.
- Add a health-service test that mocks a successful and failed database query.
- Confirm the backend starts against `docker compose up postgres`.
- Run `npm run typeorm migration:run` successfully.
- Confirm the health endpoint reports database status correctly.

## Acceptance mapping

- Backend connects to PostgreSQL on startup: handled by `DatabaseModule` and TypeORM bootstrap.
- Connection uses environment variables: handled by the shared options helper.
- `TypeOrmModule` is properly registered in `AppModule`: handled by app wiring.
- Health check endpoint verifies DB connectivity: handled by the richer health service/controller contract.
- Migration script runs successfully (`npm run typeorm migration:run`): handled by the TypeORM CLI script and shared data source.
- Works with `docker compose up postgres`: handled by the host/compose connection contract and docs.
- Connection pool configuration is documented: handled by the README update.
