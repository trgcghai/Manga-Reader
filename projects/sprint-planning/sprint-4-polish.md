# Sprint Plan: Sprint 4 — Polish & Automation

**Dates:** Week 4 | **Team:** 1 full-stack engineer
**Sprint Goal:** Improve discoverability, usability, and maintenance — add search, history, favorites, auto-detect, and dark/light theme without changing the offline-only constraint.

## Assumptions

- Single full-stack developer
- Sprint length: 5 working days
- Sprints 1–3 completed (admin, reader, progress in place)
- Capacity planned at 75%

## Capacity

| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| Full-stack dev | 5 of 5 | 30 points | 75% of 40-point capacity |
| **Total** | **5** | **30 points** | |

## Sprint Backlog

| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | Search: manga by title, author, genres; chapters by number/title | 5 | Dev | Sprint 1 manga data |
| P0 | Reading history with timestamps and "Continue reading" section | 5 | Dev | Sprint 3 progress |
| P0 | Favorites: mark, filter, persist | 3 | Dev | Sprint 1 manga data |
| P0 | Dark/light theme toggle with persistence | 4 | Dev | Tailwind config |
| P1 | Auto-detect new chapters (scan button or scheduled refresh) | 8 | Dev | Sprint 1 scanning |
| P1 | UI refinements: loading states, empty states, error handling | 5 | Dev | All prior sprints |
| P2 | Mobile-responsive improvements & accessibility basics | 3 | Dev | All prior sprints |

## Planned Capacity: 30 points | Sprint Load: 33 points (110% of capacity)

> **Cut plan if needed:** Drop P2 (mobile/a11y polish) to fit 30 points. P0 items total 17 points, leaving 13 points for P1.

### Must Ship (P0 — 17 points)
- Search bar with real-time filtering for manga and chapters
- Reading history with "Continue reading" section
- Favorites system with filter and visual indicator
- Dark/light theme toggle with persistent preference

### Should Ship (P1 — 13 points)
- Auto-detect new chapters via scan button or scheduled refresh
- Loading, empty, and error states across all pages

### Stretch (P2 — 3 points)
- Mobile-responsive improvements and accessibility basics (aria labels, keyboard focus)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Filesystem watcher behaves differently on Windows vs Linux | High | Use polling fallback, test on target OS |
| Search performance degrades with large libraries | Medium | Debounce input, limit result count |
| Theme toggle breaks reader image display | Low | Test reader in both themes, ensure backgrounds adapt |
| Auto-detect triggers too frequently or misses changes | Medium | Configurable interval, manual refresh fallback |

## Definition of Done

- [ ] Code reviewed and merged
- [ ] Tests passing (search, history, favorites, theme persistence)
- [ ] Documentation updated (AGENTS.md, feature docs)
- [ ] Library is easy to browse, search, and resume reading
- [ ] New local chapters can be detected or refreshed
- [ ] Theme preference persists across sessions
- [ ] UI handles missing data and errors gracefully
- [ ] All features remain fully local and offline

## Key Dates

| Date | Event |
|------|-------|
| Day 1 | Sprint start, search + history + favorites |
| Day 3 | Mid-sprint check-in: theme + auto-detect |
| Day 5 | Sprint end / demo: search, resume reading, toggle theme, scan for new chapters |
