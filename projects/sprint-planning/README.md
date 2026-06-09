# Sprint Planning

Based on `projects/specs/overview.md` for the local-only manga reader.

## Product Scope

- Offline-only personal manga library manager and reader
- Admin panel for CRUD management (manga, chapters, translators, languages)
- Public reading pages (library list, manga detail, chapter reader)
- Chapter ingestion from local image folders without uploads
- Multi-language and multi-translator chapter variants
- Reader progress persistence

## Team Capacity Assumption

- Single full-stack developer
- Sprint length: 1 week (5 working days)
- Capacity planned at 75% (~30 points per sprint) to leave buffer for interrupts

## Sprint Summary

| Sprint | Focus | Load | Capacity | Status |
|--------|-------|------|----------|--------|
| Sprint 1 | Foundation & Infrastructure | 35 pts | 30 pts | Planned |
| Sprint 2 | Admin Panel & Chapter Ingestion | 38 pts | 30 pts | Planned |
| Sprint 3 | Reader Experience | 35 pts | 30 pts | Planned |
| Sprint 4 | Polish & Automation | 33 pts | 30 pts | Planned |

> All sprints exceed 100% capacity. Each sprint file includes a cut plan to drop P2/P1 items and fit within 30 points.

## Sprint Files

- `sprint-1-foundation.md` — Project setup, data models, filesystem scanning
- `sprint-2-admin-panel.md` — Manga CRUD, translator/language management, chapter ingestion
- `sprint-3-reader.md` — Public pages, reader UI, progress persistence
- `sprint-4-polish.md` — Search, history, favorites, theme, auto-detect
