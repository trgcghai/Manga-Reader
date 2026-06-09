# Sprint Plan: Sprint 1 — Foundation & Infrastructure

**Dates:** Week 1 | **Team:** 1 full-stack engineer
**Sprint Goal:** Set up the project infrastructure, core data models, and filesystem scanning so the app can detect manga from a local library folder and display a basic list.

## Assumptions

- Single full-stack developer
- Sprint length: 5 working days
- No PTO or carryover (greenfield project)
- Capacity planned at 75% (leaves 25% buffer for setup, interruptions, unknowns)

## Capacity

| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| Full-stack dev | 5 of 5 | 30 points | 75% of 40-point capacity |
| **Total** | **5** | **30 points** | |

## Sprint Backlog

| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | Backend project setup & health endpoint | 3 | Dev | None |
| P0 | Frontend project setup & app shell | 3 | Dev | None |
| P0 | PostgreSQL setup & TypeORM configuration | 5 | Dev | None |
| P0 | MongoDB setup & Mongoose configuration | 5 | Dev | None |
| P0 | Redis setup & cache manager configuration | 3 | Dev | None |
| P0 | Define core entities: Manga, Chapter, Translation, Translator | 5 | Dev | DB setup |
| P0 | Filesystem scanning service (detect manga folders from library root) | 8 | Dev | Entities defined |
| P1 | Image discovery service (scan chapter folder, return sorted image list) | 5 | Dev | None |
| P1 | Basic REST: GET /manga, GET /manga/:id | 3 | Dev | Entities defined |
| P2 | Docker Compose dev environment (backend + frontend + Postgres + Mongo + Redis) | 3 | Dev | Backend + frontend setup |

## Planned Capacity: 30 points | Sprint Load: 43 points (143% of capacity)

> **Cut plan if needed:** Drop P2 (Docker Compose polish) and P1 (image discovery) to fit 30 points. P0 items total 32 points, leaving -2 points for P1. Multi-DB setup increases baseline load.

### Must Ship (P0 — 32 points)
- Backend + frontend running locally
- PostgreSQL connected via TypeORM with Manga, Chapter, Translation, Translator tables
- MongoDB connected via Mongoose for flexible document storage (e.g., reading history, session cache)
- Redis connected for caching and session/state management
- Filesystem scanning detects manga from a configured library path
- GET /manga returns scanned results

### Should Ship (P1 — 8 points)
- Image discovery returns sorted file list from a chapter folder
- GET /manga/:id returns full detail

### Stretch (P2 — 3 points)
- Docker Compose dev environment fully working (Postgres + Mongo + Redis + apps)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Filesystem path handling differs between Windows host and Linux container | High | Use Node.js `path` module, test on target OS, document expected path format |
| Managing 3 databases adds complexity and connection overhead | High | Abstract DB access behind services, use connection pooling, configure health checks |
| Image sort order doesn't match user expectation | Medium | Implement natural sort, add tests with numeric filenames |

## Definition of Done

- [ ] Code reviewed and merged
- [ ] Tests passing (filesystem scanning, image discovery, DB connections)
- [ ] Documentation updated (AGENTS.md, README)
- [ ] Backend and frontend run locally via `npm run start:dev` / `npm run dev`
- [ ] PostgreSQL, MongoDB, and Redis connections verified and healthy
- [ ] Library scan works with a sample fixture folder
- [ ] No external API calls or cloud dependencies

## Key Dates

| Date | Event |
|------|-------|
| Day 1 | Sprint start, project setup |
| Day 3 | Mid-sprint check-in: entities + scanning service |
| Day 5 | Sprint end / demo: scan a library folder and display manga list |
