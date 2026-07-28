# Manga Reader

A full-stack offline manga reader application. Built with a NestJS backend and a TanStack Start + React frontend.

## Architecture

- **Frontend** — TanStack Start + Vite + React, served on port `3000`
- **Backend** — NestJS + TypeScript API, served on port `3001`
- **PostgreSQL** — Primary database
- **Redis** — Caching
- **MongoDB** — Document storage (optional, for future use)
- **MinIO** — Object storage for manga page images

## Prerequisites

### Docker

- Docker
- Docker Compose

### Manual

- Node.js >= 22
- MinIO installed
- PostgreSQL installed

## How to Run

### Docker Compose (recommended)

```bash
docker compose up --build
```

This starts all services with hot-reload enabled. Changes to `backend/` or `frontend/` are picked up automatically via bind mounts.

| Service  | URL                  |
|----------|----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:3001 |
| MinIO    | http://localhost:9001 |

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

## Project Structure

```
backend/          — NestJS API server
frontend/         — TanStack Start + React app
  src/routes/     — Route definitions
docker-compose.yml — Full-stack local dev environment
opencode.json     — OpenCode configuration
AGENTS.md         — Workflow notes for AI coding assistants
```
