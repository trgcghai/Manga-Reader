# Manga Reader

A self-hosted web application for reading and managing manga library with your own sources.

## Architecture

- **Frontend** — TanStack Start + Vite + React, served on port `3000`
- **Backend** — NestJS + TypeScript API, served on port `3001`
- **PostgreSQL** — Primary database
- **Redis** — Caching
- **MongoDB** — Document storage (optional, for future use)
- **MinIO** — Object storage for manga page images

## Prerequisites

This application requires docker and docker compose to run with. If you tend to run it manually, you should have installed [NodeJS](https://nodejs.org/en/download) >= 22, [MinIO](https://docs.min.io/aistor/), [PostgreSQL](https://www.postgresql.org/download/) and Redis (Cloud or Local is depended on your preference)

## How to Run

### Docker Compose (recommended)

```bash
docker compose up --build -d
```

This starts all services with hot-reload enabled. Changes to `backend/` or `frontend/` are picked up automatically via bind mounts.

| Service  | URL                  |
|----------|----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:3001 |
| MinIO    | http://localhost:9001 |

### Production Docker Compose

Production Compose runs only the backend and frontend containers. PostgreSQL, MongoDB, Redis, and the S3 compatible object storage service must be reachable separately.

```bash
cp .env.production.example .env.production
```

Set the external service connection values and credentials in `.env.production`. Set `FRONTEND_URL` to the frontend's browser origin for backend CORS, and `VITE_API_URL` to the backend URL browsers can reach before building the frontend image. Create the configured storage bucket in advance and apply the access policy needed for your deployment. `STORAGE_ENDPOINT` can be left empty for AWS S3; `STORAGE_PUBLIC_URL` is the browser reachable base used for returned object URLs.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

The default published ports are frontend `3000` and backend `3001`, configurable with `FRONTEND_PORT` and `BACKEND_PORT`.

### Manual Setup

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:3001` (configurable via `VITE_API_URL`).

## Available Scripts

### Backend

| Script          | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start with hot-reload    |
| `npm run build` | Compile to `dist/`       |
| `npm run test`  | Run unit tests           |
| `npm run lint`  | Lint and fix source files|

### Frontend

| Script                   | Description               |
|--------------------------|---------------------------|
| `npm run dev`            | Start dev server          |
| `npm run build`          | Production build          |
| `npm run generate-routes`| Regenerate route tree     |
| `npm run test`           | Run tests (Vitest)        |
| `npm run lint`           | Lint source files         |
| `npm run check`          | Format check (Prettier)   |

