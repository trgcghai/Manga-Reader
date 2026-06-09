# Sprint Plan: Sprint 2 — Admin Panel & Chapter Ingestion

**Dates:** Week 2 | **Team:** 1 full-stack engineer
**Sprint Goal:** Deliver the admin interface for managing manga, translators, languages, and chapter ingestion from local folders — the core content management workflow.

## Assumptions

- Single full-stack developer
- Sprint length: 5 working days
- Sprint 1 completed (entities, scanning, app shell in place)
- Capacity planned at 75%

## Capacity

| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| Full-stack dev | 5 of 5 | 30 points | 75% of 40-point capacity |
| **Total** | **5** | **30 points** | |

## Sprint Backlog

| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | Manga CRUD: Create & List (form + API) | 5 | Dev | Sprint 1 entities |
| P0 | Manga CRUD: Edit & Delete | 3 | Dev | Manga CRUD create |
| P0 | Translator management per manga (add/edit/remove) | 5 | Dev | Manga CRUD |
| P0 | Language configuration per manga (add/remove) | 5 | Dev | Manga CRUD |
| P0 | Chapter creation form: path input + language/translator select | 5 | Dev | Translator + language management |
| P0 | Chapter folder scan & preview before save | 5 | Dev | Chapter form, image discovery |
| P1 | Chapter list per manga with language/translator labels | 3 | Dev | Chapter creation |
| P1 | Path validation & security middleware (prevent traversal) | 4 | Dev | Chapter creation |
| P2 | Admin panel layout (separate from reader pages) | 3 | Dev | Frontend app shell |

## Planned Capacity: 30 points | Sprint Load: 38 points (127% of capacity)

> **Cut plan if needed:** Drop P2 (admin layout polish) and reduce P1 (chapter list) to fit 30 points. P0 items total 28 points, leaving 2 points for P1.

### Must Ship (P0 — 28 points)
- Full manga CRUD (create, edit, delete)
- Translator management scoped per manga
- Language configuration scoped per manga
- Chapter creation with required folder path, language, and translator selection
- Folder scan returns image preview before final save
- Chapter saved with translation metadata (language + translator + folder path)

### Should Ship (P1 — 7 points)
- Chapter list per manga with language/translator labels
- Path validation prevents directory traversal

### Stretch (P2 — 3 points)
- Admin panel layout separate from reader pages

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Folder path input must handle Windows and Unix paths | High | Normalize paths with Node.js `path`, document expected format |
| Image preview with many files causes performance issues | Medium | Lazy-load preview thumbnails, limit initial display count |
| Language/translator selection UX is confusing | Medium | Clear labels, show existing combinations, prevent duplicates |
| Path validation missed edge cases | High | Test with `..` traversal, symlinks, non-existent paths |

## Definition of Done

- [ ] Code reviewed and merged
- [ ] Tests passing (path validation, folder scanning, metadata CRUD)
- [ ] Documentation updated (AGENTS.md, API docs)
- [ ] Admin can create manga, add translators/languages, and ingest chapters
- [ ] No file upload occurs; all content comes from local folders
- [ ] Multiple translations (language + translator combos) exist per chapter

## Key Dates

| Date | Event |
|------|-------|
| Day 1 | Sprint start, manga CRUD |
| Day 3 | Mid-sprint check-in: translator/language + chapter form |
| Day 5 | Sprint end / demo: create manga, add chapter from folder path, see scanned images |
