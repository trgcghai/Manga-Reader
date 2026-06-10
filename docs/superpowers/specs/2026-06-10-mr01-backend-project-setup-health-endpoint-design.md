# MR01 Backend Project Setup & Health Endpoint Design

## Context

The backend already exists as a NestJS starter. MR01 should finish the project setup by making the server explicit about its runtime port, adding a health endpoint, and keeping the existing starter root route intact.

## Goals

- Keep the current NestJS app structure.
- Serve `GET /health` with a simple `{"status":"ok"}` response.
- Keep `GET /` returning the starter greeting.
- Require `PORT` at startup and fail fast if it is missing.
- Preserve the existing TypeScript, ESLint, Prettier, and Docker setup so the documented scripts work.

## Non-goals

- No authentication.
- No database wiring.
- No additional API surface beyond the health endpoint.
- No refactor of the starter app into a larger module system.

## Proposed structure

### Bootstrap

`backend/src/main.ts` will read `process.env.PORT` directly. If the variable is missing or empty, the app will throw before calling `listen()`. This keeps startup explicit and avoids silently binding to the wrong port.

`docker-compose.yml` already provides `PORT=3001` for the backend service, so the fail-fast rule only affects direct runs and any future entrypoints that omit the variable.

### Routing

The existing `AppController` continues handling `GET /`.

A new `HealthController` handles `GET /health` and returns:

```json
{ "status": "ok" }
```

The controller stays stateless and does not call any service layer.

### Module wiring

`AppModule` registers the new health controller alongside the existing app controller. No new module boundary is needed for this task.

### Scripts and build

The backend package should continue exposing the documented Nest scripts:

- `start`
- `start:dev`
- `build`
- `lint`
- `format`

The Dockerfile should keep building the Nest app in a multi-stage flow and expose the app on port `3001` in the image metadata.

## Error handling

- Missing `PORT` is a startup error.
- `GET /health` should stay trivial and deterministic.
- No fallback behavior should be added for the port value.

## Testing

- Keep the existing root controller test.
- Add a controller test for `GET /health`.
- Verify the app starts in watch mode, linting passes, formatting passes, and the Docker image builds successfully.

## Acceptance mapping

- `npm run start:dev` succeeds: app boots only when `PORT` is present.
- `GET /health` returns 200 with `{"status":"ok"}`: covered by controller and e2e/unit tests.
- `npm run lint` and `npm run format` pass: preserved by current tooling and config.
- `docker build -t backend .` succeeds: Dockerfile remains aligned with the Nest build output.
- `backend/package.json` scripts work as documented: no script changes beyond any needed alignment fixes.
