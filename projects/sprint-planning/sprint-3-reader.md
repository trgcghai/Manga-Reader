# Sprint Plan: Sprint 3 — Reader Experience

**Dates:** Week 3 | **Team:** 1 full-stack engineer
**Sprint Goal:** Build the public-facing reading flow — library browsing, chapter selection, and the manga reader with progress persistence and translation switching.

## Assumptions

- Single full-stack developer
- Sprint length: 5 working days
- Sprints 1–2 completed (data models, scanning, admin panel in place)
- Capacity planned at 75%

## Capacity

| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| Full-stack dev | 5 of 5 | 30 points | 75% of 40-point capacity |
| **Total** | **5** | **30 points** | |

## Sprint Backlog

| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | Public library page (grid/list of manga with covers) | 5 | Dev | Sprint 1 manga list |
| P0 | Manga detail page with organized chapter list | 5 | Dev | Sprint 2 chapters |
| P0 | Reader: Page-by-page mode with keyboard navigation | 8 | Dev | Image discovery |
| P0 | Progress persistence (remember last read page per chapter) | 5 | Dev | Reader |
| P1 | Reader: Continuous scroll mode (webtoon-style) | 5 | Dev | Page-by-page reader |
| P1 | Translation switching UI (language + translator dropdown) | 4 | Dev | Sprint 2 translation metadata |
| P2 | Backend: GET /manga/:id/chapters, GET /chapter/:id/images | 3 | Dev | Sprint 2 chapter CRUD |

## Planned Capacity: 30 points | Sprint Load: 35 points (117% of capacity)

> **Cut plan if needed:** Drop P2 (backend endpoints — use existing) and P1 (scroll mode) to fit 30 points. P0 items total 23 points, leaving 7 points for P1.

### Must Ship (P0 — 23 points)
- Public library page with manga grid
- Manga detail page with chapter list grouped by language/translator
- Page-by-page reader with keyboard navigation and click zones
- Progress persistence (last read page saved and restored)
- "Continue reading" indicator on chapter list

### Should Ship (P1 — 9 points)
- Continuous scroll mode
- Translation switching preserves page position

### Stretch (P2 — 3 points)
- Dedicated backend endpoints for chapter listing and image retrieval

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large image files cause slow loading | High | Preload adjacent pages only, lazy-load scroll mode |
| localStorage size limits with many chapters | Medium | Use IndexedDB for progress storage, implement cleanup |
| Scroll mode performance degrades with 100+ images | Medium | Virtualize image list, lazy-load with intersection observer |
| Translation switching loses page position | Low | Map page numbers between translations when possible |

## Definition of Done

- [ ] Code reviewed and merged
- [ ] Tests passing (reader navigation, progress save/restore, translation switching)
- [ ] Documentation updated (AGENTS.md, reader usage notes)
- [ ] User can browse library, open manga, select chapter, and read
- [ ] Reader remembers last page and resumes correctly
- [ ] Both page-by-page and scroll modes work (if P1 included)
- [ ] No authentication or internet required

## Key Dates

| Date | Event |
|------|-------|
| Day 1 | Sprint start, library + detail pages |
| Day 3 | Mid-sprint check-in: reader + progress persistence |
| Day 5 | Sprint end / demo: read a chapter, switch translation, resume from last page |
