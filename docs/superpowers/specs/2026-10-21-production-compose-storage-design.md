# Production Compose and S3 Compatible Storage Design

## Goal

Provide a production Docker Compose deployment for the Manga Reader application that runs only the backend and frontend containers. The application connects to separately operated PostgreSQL, MongoDB, Redis, and S3 compatible object storage services.

## Constraints and assumptions

- The existing root `docker-compose.yml` remains the local development stack with its hot reload and supporting services.
- Production Compose is a separate file and declares exactly two services: backend and frontend.
- Database, cache, and object storage endpoints are supplied by the operator through a production environment file.
- Object storage may be MinIO or another S3 compatible provider. The backend uses AWS SDK v3 and `STORAGE_*` configuration names.
- The operator creates the configured object bucket and configures whatever read access the deployment requires. The app does not create buckets or alter bucket policies.
- The public object URL prefix can differ from the endpoint the backend uses to reach storage.

## Production deployment

Add a production Compose file that builds the existing Dockerfile `runtime` stages for backend and frontend. It must not declare databases, Redis, MinIO, or other infrastructure containers. It reads backend and frontend values from `.env.production`, with `.env.production.example` documenting all required values and safe placeholders.

Backend configuration includes `NODE_ENV`, `PORT`, PostgreSQL connection fields, `MONGODB_URI`, `REDIS_URL`, and storage values. Frontend `VITE_API_URL` is passed as a build argument because the frontend API client reads it through `import.meta.env` and Vite embeds it during the production build. The value must be reachable by users' browsers.

Document copying the example to `.env.production`, filling required values, and starting the production Compose file. Do not add real credentials to the example.

## S3 compatible storage integration

Replace the `minio` package and MinIO-specific client calls with `@aws-sdk/client-s3` commands. Keep the existing injection boundary for the storage client, updating names/types as needed. Support:

- `STORAGE_ENDPOINT` for a custom S3 endpoint, including MinIO; allow it to be empty for AWS's default endpoint behavior.
- `STORAGE_PUBLIC_URL` as the externally reachable base URL used to construct URLs returned by upload.
- `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_BUCKET`.

Configure path-style addressing when using a custom endpoint. Preserve upload, download, delete, and recursive list behavior, including MIME handling, generated keys, and API error semantics. Parse storage download URLs against `STORAGE_PUBLIC_URL` and the configured bucket. The app must not provision the bucket or write bucket policies; its credentials need only the object operations required by the API.

## Health endpoint

Extend `GET /health` to perform an authenticated `HeadBucket` against the configured bucket. Return storage as connected alongside the existing PostgreSQL, MongoDB, and Redis statuses. If the bucket is unavailable or credentials cannot access it, return HTTP 503 consistent with current dependency failures. Do not expose credentials or raw provider errors in the response.

## Documentation and affected files

- Add production Compose and `.env.production.example` at the repository root.
- Update backend storage module/service/controller/constants/utilities and their existing unit tests.
- Update backend health controller and its unit/e2e expectations.
- Update backend package manifest and lockfile to replace the MinIO dependency with AWS SDK v3.
- Update the README with production deployment instructions and configuration.
- Keep generated frontend route files untouched.

## Verification

- Run the focused backend file storage and health tests after updating them.
- Run the backend build and frontend production build.
- Validate production Compose configuration and confirm it contains only backend and frontend services.
- Confirm the development Compose configuration remains usable and its service set is unchanged.

## Out of scope

- Adding infrastructure containers to production Compose.
- Changing the local development topology.
- Implementing storage bucket provisioning, public access policy management, or signed URL workflows.
- Changing frontend route behavior or database/cache architecture.
