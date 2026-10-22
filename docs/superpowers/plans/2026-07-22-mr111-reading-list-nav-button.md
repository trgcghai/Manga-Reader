# MR111 — Reading List Nav Button Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Reading List" button with `Bookmark` icon to the `AppHeader`, left of "Admin Dashboard", linking to `/flagged`.

**Architecture:** Single-file change to `AppHeader.tsx`. Import `Bookmark` from `lucide-react`, add a `Button` + `Link` block before the existing admin button, following the same wrapper pattern.

**Tech Stack:** React, shadcn/ui Button, TanStack Router Link, lucide-react

**Related Skills:** None (trivial single-file change, no tests, no new patterns)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/components/app/AppHeader.tsx` | Modify | Add Reading List nav button with Bookmark icon |

---

### Task 1: Add Reading List button to AppHeader

- [ ] **Import `Bookmark` icon** at the top of `AppHeader.tsx`:

```typescript
import { Bookmark } from 'lucide-react'
```

- [ ] **Insert Reading List button** before the Admin Dashboard button (after line 15 `<nav>`, before line 16 `<Button variant="secondary"...`):

```tsx
          <Button variant="secondary" size="sm" title="Reading List">
            <Link to="/flagged">
              <Bookmark className="h-4 w-4" />
              Reading List
            </Link>
          </Button>
```

---

### Task 2: Verify build

- [ ] **Run type check:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TS errors (only pre-existing errors in other files).

- [ ] **Run existing tests:**

```bash
cd frontend && npm run test
```

Expected: 4 test files, 47 tests, all passed.
