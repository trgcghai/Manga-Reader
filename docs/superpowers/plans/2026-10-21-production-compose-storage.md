# Production Compose and S3 Compatible Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production Compose deployment containing only backend and frontend, configured for external infrastructure and S3 compatible storage through AWS SDK v3.

**Architecture:** Add a separate production Compose file and example environment file while preserving the current development Compose. Replace MinIO SDK calls behind the current storage service boundary with AWS SDK v3 commands, use `STORAGE_*` values for endpoint and public URL configuration, and have the API validate bucket access through `/health`.

**Tech Stack:** Docker Compose, Node.js 22, NestJS, TypeScript, AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`), TanStack Start/Vite.

**Spec:** `docs/superpowers/specs/2026-10-21-production-compose-storage-design.md`

## Global Constraints

- The existing root `docker-compose.yml` remains the local development stack with its hot reload and supporting services.
- Production Compose is a separate file and declares exactly two services: backend and frontend.
- Database, cache, and object storage endpoints are supplied by the operator through a production environment file.
- Object storage may be MinIO or another S3 compatible provider. The backend uses AWS SDK v3 and `STORAGE_*` configuration names.
- The operator creates the configured object bucket and configures whatever read access the deployment requires. The app does not create buckets or alter bucket policies.
- The public object URL prefix can differ from the endpoint the backend uses to reach storage.
- Frontend `VITE_API_URL` is passed as a build argument because the frontend API client reads it through `import.meta.env` and Vite embeds it during the production build.
- Do not add real credentials to the example.

## Review Focus

- A storage URL from another host or bucket must be rejected rather than mapped to an object key — add a URL utility/controller test in Task 2.
- AWS default endpoint selection must work when `STORAGE_ENDPOINT` is empty — add a client configuration test in Task 1.
- S3 access failures during health checks must return 503 without provider error details — add tests in Task 3.
- Object listings spanning multiple S3 pages must return all keys — add a pagination test in Task 2.
- Frontend API URL must be present in the production build, not merely in the runtime container environment — verify the Docker build wiring in Task 4.

---

## File Map

- `backend/package.json`, `backend/package-lock.json`: replace the MinIO dependency with AWS SDK v3.
- `backend/src/common/constants/file.constant.ts`: rename the injected client token to `STORAGE_CLIENT`.
- `backend/src/modules/file/file.module.ts`: configure `S3Client`; stop creating buckets and writing policies.
- `backend/src/modules/file/file.service.ts`: implement object operations and bucket health check using SDK commands.
- `backend/src/common/utils/file-mime.util.ts` and its spec: parse public storage URLs safely.
- `backend/src/modules/file/file.controller.ts` and its spec: validate download URLs using the public storage URL.
- `backend/src/modules/manga/services/translation.service.ts` and its spec: parse stored object URLs using `FileService.publicUrl` when replacing or deleting translation files.
- `backend/src/modules/manga/services/manga.service.ts` and its spec: parse cover object URLs using `FileService.publicUrl` when replacing or deleting covers.
- `backend/src/modules/file/file.module.spec.ts`, `backend/src/modules/file/file.service.spec.ts`: cover AWS SDK configuration and object commands.
- `backend/src/health.controller.ts`, `backend/src/health.controller.spec.ts`, `backend/test/app.e2e-spec.ts`: expose storage health and test healthy/unavailable responses.
- `backend/Dockerfile`: no change expected; it already has builder and runtime stages.
- `frontend/Dockerfile`: install build dependencies in the builder and pass the Vite API URL into the build stage.
- `backend/src/main.ts`: configure CORS from `FRONTEND_URL`, retaining localhost as the development default.
- `docker-compose.production.yml`: add exactly backend and frontend services with runtime targets.
- `.env.production.example`: document required backend and frontend settings with placeholders.
- `.gitignore`: allow the production environment example to be tracked while keeping real environment files ignored.
- `README.md`: document production env setup and launch command.

## Task 1: Add AWS S3 client configuration

**Related skills:** `superpowers:test-driven-development`, `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `backend/src/common/constants/file.constant.ts`
- Modify: `backend/src/modules/file/file.module.ts`
- Test: `backend/src/modules/file/file.module.spec.ts`

**Interfaces:**
- Produces: injection token `STORAGE_CLIENT` for an AWS SDK v3 `S3Client`.
- Consumes: `STORAGE_ENDPOINT` (optional), `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_BUCKET` from `ConfigService`.

- [ ] **Step 1: Replace the module test with SDK client configuration assertions**

Assert `STORAGE_CLIENT` resolves to an `S3Client`, uses the configured custom endpoint and region, enables path-style addressing for a custom endpoint, and uses the configured static credentials. Add a second case proving an empty `STORAGE_ENDPOINT` is passed as no custom endpoint, allowing the AWS SDK's default endpoint resolution.

- [ ] **Step 2: Run the focused module test and confirm it fails**

Run: `cd backend && npm test -- --runInBand src/modules/file/file.module.spec.ts`
Expected: FAIL because the module still exposes the MinIO client and reads `MINIO_*` configuration.

- [ ] **Step 3: Install AWS SDK v3 and replace the provider**

Add `@aws-sdk/client-s3` to backend runtime dependencies, updating the npm lockfile; keep `minio` temporarily because `FileService` still uses it until Task 2. Add the `STORAGE_CLIENT` token and construct an `S3Client` with `region`, credentials, and only set `endpoint` plus `forcePathStyle: true` when `STORAGE_ENDPOINT` is non-empty. Validate required region, credentials, and bucket configuration. Keep the existing MinIO provider and lifecycle initialization until Task 2 migrates `FileService`, so this task remains runnable without a half-migrated file service.

- [ ] **Step 4: Run module test and backend type build**

Run: `cd backend && npm test -- --runInBand src/modules/file/file.module.spec.ts && npm run build`
Expected: PASS; the AWS client provider resolves with both custom and default endpoint configurations.

- [ ] **Step 5: Commit the storage client migration**

Commit the passing client provider, dependency, token, and module test changes as `feat: replace MinIO client with AWS S3 SDK`.

## Task 2: Migrate file operations and URL handling

**Related skills:** `superpowers:test-driven-development`, `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Modify: `backend/src/modules/file/file.service.ts`
- Modify: `backend/src/modules/file/file.module.ts`
- Modify: `backend/src/common/constants/file.constant.ts`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `backend/src/modules/file/file.controller.ts`
- Modify: `backend/src/common/utils/file-mime.util.ts`
- Modify: `backend/src/modules/file/file.service.spec.ts`
- Modify: `backend/src/modules/file/file.controller.spec.ts`
- Modify: `backend/src/common/utils/file-mime.util.spec.ts`
- Modify: `backend/src/modules/manga/services/translation.service.ts`
- Modify: `backend/src/modules/manga/services/translation.service.spec.ts`
- Modify: `backend/src/modules/manga/services/manga.service.ts`
- Modify: `backend/src/modules/manga/services/manga.service.spec.ts`

**Interfaces:**
- Consumes: Task 1's `STORAGE_CLIENT` token and S3Client provider.
- Produces: `FileService.publicUrl` based on `STORAGE_PUBLIC_URL`; `extractKeyFromUrl(url, publicUrl, bucket): string | null`.

- [ ] **Step 1: Rewrite file service tests for AWS SDK command sends**

Mock the S3 client `send()` method and assert `PutObjectCommand` receives bucket, generated key, buffer, and `ContentType`; `GetObjectCommand` returns a Node readable body; `DeleteObjectCommand` receives bucket and key; and `ListObjectsV2` pagination returns names from each page. Pin upload URL construction to `STORAGE_PUBLIC_URL/{bucket}/{key}`. Cover a missing key error mapping to `NotFoundException` and generic provider failures mapping to `InternalServerErrorException`.

- [ ] **Step 2: Rewrite storage URL utility/controller tests**

Assert the utility extracts keys from the configured public URL and bucket, rejects a different host or bucket, and decodes percent-encoded key segments safely. Update the controller download tests to use the configured public URL and reject URLs outside that origin/prefix. Update `TranslationService` tests to confirm replacement/deletion extracts keys from `FileService.publicUrl` and ignores URLs outside that storage location.

- [ ] **Step 3: Run focused storage tests and confirm migration failures**

Run: `cd backend && npm test -- --runInBand src/modules/file/file.service.spec.ts src/modules/file/file.controller.spec.ts src/common/utils/file-mime.util.spec.ts src/modules/manga/services/translation.service.spec.ts src/modules/manga/services/manga.service.spec.ts`
Expected: FAIL because implementation still calls MinIO methods and uses the old endpoint property.

- [ ] **Step 4: Implement upload, download, delete, and list with AWS SDK commands**

Use `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, and `paginateListObjectsV2` (or an equivalent `ListObjectsV2Command` continuation-token loop). Preserve generated keys, MIME extension mapping, content type, `StreamableFile` behavior, and API exception semantics. Use `STORAGE_PUBLIC_URL` for returned URLs and parse download URLs against that value plus the bucket. Handle AWS SDK missing-object errors (`NoSuchKey`, `NotFound`, or HTTP 404) as `NotFoundException` without exposing provider messages. Switch `FileService` to `STORAGE_CLIENT`; then remove the old MinIO provider, bucket creation/policy lifecycle hook, `MINIO_CLIENT` token, and `minio` package once no source file uses them.

- [ ] **Step 5: Run focused storage tests and backend build**

Run: `cd backend && npm test -- --runInBand src/modules/file/file.service.spec.ts src/modules/file/file.controller.spec.ts src/common/utils/file-mime.util.spec.ts src/modules/manga/services/translation.service.spec.ts src/modules/manga/services/manga.service.spec.ts && npm run build`
Expected: PASS; `rg -n "from 'minio'|MINIO_|Minio\." backend/src backend/package.json` returns no matches.

- [ ] **Step 6: Commit file storage migration**

Commit the passing storage operations, URL handling, API descriptions, and tests as `feat: use S3 compatible file storage`.

## Task 3: Add object storage to `/health`

**Related skills:** `superpowers:test-driven-development`, `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Modify: `backend/src/health.controller.ts`
- Modify: `backend/src/health.controller.spec.ts`
- Modify: `backend/test/app.e2e-spec.ts`
- Modify: `backend/src/modules/file/file.service.spec.ts`

**Interfaces:**
- Consumes: Task 2's `FileService` and Task 1's S3 client provider.
- Produces: `FileService.checkStorageAccess(): Promise<void>` issuing `HeadBucketCommand` for the configured bucket; a successful `/health` body with `storage: "connected"`; a storage check failure produces HTTP 503 with a generic storage-unavailable message.

- [ ] **Step 1: Add storage health unit tests**

Update successful controller expectations to include storage. Mock `FileService.checkStorageAccess()` and assert it is called. Add a rejected-check case asserting `ServiceUnavailableException` with a generic message that does not contain the SDK/provider error text. Add a FileService test asserting `HeadBucketCommand` uses the configured bucket and propagates a rejected command for the controller to handle.

- [ ] **Step 2: Run the focused health tests and confirm they fail**

Run: `cd backend && npm test -- --runInBand src/health.controller.spec.ts src/modules/file/file.service.spec.ts`
Expected: FAIL because HealthController does not yet depend on FileService and the service has no bucket health check.

- [ ] **Step 3: Wire FileService into the health controller**

Inject `FileService`, call `checkStorageAccess()` after the existing PostgreSQL, MongoDB, and Redis checks, and translate storage failures to `ServiceUnavailableException` with a generic message. Add storage to the success response and OpenAPI descriptions. Have `checkStorageAccess()` send `HeadBucketCommand` for the configured bucket.

- [ ] **Step 4: Update and run health unit/e2e tests**

Update the e2e controller providers with a successful FileService mock and include `storage: "connected"` in the expected JSON. Add a second e2e case where the storage check rejects and assert HTTP 503 with a generic response. Run: `cd backend && npm test -- --runInBand src/health.controller.spec.ts src/modules/file/file.service.spec.ts && npm run test:e2e -- --runInBand`
Expected: PASS; failed object storage yields HTTP 503 and success includes all four dependencies.

- [ ] **Step 5: Commit storage health support**

Commit the health controller, health tests, and bucket access check as `feat: include object storage in health endpoint`.

## Task 4: Add the production Compose deployment and operator docs

**Related skills:** `superpowers:verification-before-completion`

**Files:**
- Create: `docker-compose.production.yml`
- Create: `.env.production.example`
- Modify: `.gitignore`
- Modify: `frontend/Dockerfile`
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1–3's backend `STORAGE_*` variables and health route; existing runtime Docker targets.
- Produces: production deployment configured with exactly `backend` and `frontend` Compose services.

- [ ] **Step 1: Define the production environment example**

List `NODE_ENV`, `PORT`, `FRONTEND_URL`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `MONGODB_URI`, `REDIS_URL`, `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, and `VITE_API_URL`. Use safe placeholder values; document that `STORAGE_ENDPOINT` may be empty for AWS, `FRONTEND_URL` sets the browser origin allowed by backend CORS, and `VITE_API_URL` must be browser reachable. Add a `.gitignore` exception for `.env.production.example` while keeping `.env.production` ignored.

- [ ] **Step 2: Add production Compose and frontend build argument support**

Create `docker-compose.production.yml` with only backend and frontend, both built with `target: runtime`; load runtime backend settings from `.env.production`. Pass `VITE_API_URL` as a frontend Docker build argument. In `frontend/Dockerfile`, install full dependencies in the builder before `npm run build`, declare/propagate the build argument into Vite's build environment, and keep the runtime stage limited to production dependencies. Do not add volumes, development commands, or infrastructure services to the production file.

- [ ] **Step 3: Document production run and storage provisioning**

Add README instructions to copy `.env.production.example` to `.env.production`, fill external database/cache/storage credentials, pre-create the bucket with the desired access policy, and launch with `docker compose --env-file .env.production -f docker-compose.production.yml up --build -d`. List the production app ports and explain that database, Redis, and S3 compatible services are external.

- [ ] **Step 4: Validate Compose shape and production builds**

Copy `.env.production.example` to `.env.production` for the configuration check, then run: `docker compose --env-file .env.production -f docker-compose.production.yml config --services`
Expected: exactly `backend` and `frontend`.

Run: `docker compose --env-file .env.production -f docker-compose.production.yml config`
Expected: no undefined variables; backend and frontend use `runtime` build targets and no infrastructure services.

Run: `cd backend && npm run build`; `cd frontend && npm run build`
Expected: both production builds complete successfully.

- [ ] **Step 5: Confirm development Compose remains unchanged**

Run: `docker compose -f docker-compose.yml config --services`
Expected: existing development services remain `redis`, `mongodb`, `postgres`, `minio`, `backend`, and `frontend`.

- [ ] **Step 6: Commit the production deployment**

Commit Compose, the env example and ignore rule, Dockerfile build wiring, and README instructions as `feat: add production docker compose deployment`.

## Final Review

- [ ] Confirm `backend/src` has no MinIO package imports or `MINIO_*` configuration references.
- [ ] Confirm the production Compose defines exactly two services and the development Compose still defines its original six.
- [ ] Confirm the `.env.production.example` contains placeholders only and documents every variable read by the production Compose/backend.
- [ ] Run the focused backend storage and health tests, backend build, frontend build, and Compose validation commands above.
