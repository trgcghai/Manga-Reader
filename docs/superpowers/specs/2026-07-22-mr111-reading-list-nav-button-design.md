# MR111 — Reading List Navigation Button

## Overview

Add a "Reading List" button with `Bookmark` icon to the `AppHeader`, positioned left of "Admin Dashboard", linking to `/flagged`. Uses the same `Button` > `Link` wrapper pattern as the existing admin button for consistency.

## Scope

Single change to `frontend/src/components/app/AppHeader.tsx`. No new files. No test changes (no test file exists for `AppHeader`).

## Changes

### `AppHeader.tsx`

- Import `Bookmark` from `lucide-react`
- Insert a new `<Button variant="secondary" size="sm" title="Reading List">` before the existing Admin Dashboard button
- Wrap a `<Link to="/flagged">` inside it containing `<Bookmark className="h-4 w-4" /> Reading List`
- The `_app` layout shell ensures the button appears on all pages

## Rationale

- **Consistency:** Same `<Button><Link>...</Link></Button>` pattern as Admin Dashboard — avoids mixing patterns in the same nav
- **Minimal diff:** One file, ~5 lines added, no structural changes
- **Icon placement:** `Bookmark` icon before label text, matching common nav pattern
