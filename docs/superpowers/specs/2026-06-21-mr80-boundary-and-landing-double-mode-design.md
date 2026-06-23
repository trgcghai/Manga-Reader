# MR80: Fix Boundary Logic and Cross-Chapter Landing for Double Mode — Design Spec

## Goal

Fix two issues in `reader.$translationId.tsx` so the reader correctly detects chapter boundaries and lands on the right spread when crossing chapters in double mode.

## Approach: Inline fixes in route, no new abstractions

### Fix 1: Boundary check in `handleNextPage` (lines 46-58)

Use `displayMode` to compute a dynamic `step` for the boundary comparison.

**Current:**
```ts
if (currentPage < totalPages - 1) { nextPage() }
```

**New:**
```ts
const step = displayMode === 'double' ? 2 : 1
if (currentPage < totalPages - step) { nextPage() }
```

### Fix 2: Landing page in `pendingDirection` effect (lines 74-83)

When navigating to the previous chapter, land on the last spread's left page instead of the last physical page.

**Current:**
```ts
setCurrentPage(pages.length - 1)
```

**New:**
```ts
if (displayMode === 'double') {
  setCurrentPage(pages.length - 2 >= 0 ? pages.length - 2 : 0)
} else {
  setCurrentPage(pages.length - 1)
}
```

### Behavior tables

#### Boundary check (4-page chapter, double mode)

| Spread | currentPage | step | totalPages - step | nextPage called? | Result |
|---|---|---|---|---|---|
| [1,2] | 0 | 2 | 2 | 0 < 2 → yes | Advances to 2 |
| [3,4] | 2 | 2 | 2 | 2 < 2 → no | Chapter advance (no ghost) |

#### Boundary check (3-page chapter, double mode)

| currentPage | step | totalPages - step | nextPage called? | Result |
|---|---|---|---|---|
| 0 | 2 | 1 | 0 < 1 → yes | Advances to 2 |
| 2 | 2 | 1 | 2 < 1 → no | Chapter advance |

#### Landing after prev chapter (double mode)

| pages.length | displayMode | Landing page | Visible spread |
|---|---|---|---|
| 4 (even) | double | 2 | [3,4] |
| 3 (odd) | double | 2 | [3] alone (last page) |
| 5 (odd) | double | 4 | [5] alone (last page) |
| any | single | last | unchanged |

### Edge cases

- **1-page chapter in double mode**: prev landing `1 - 2 = -1`, clamped to 0 by `>= 0 ?` guard
- **Single mode**: `displayMode !== 'double'`, falls through to `pages.length - 1` (unchanged)
- **No prev translation**: `handlePrevPage` early return before `pendingDirection` logic

## File Changes

| File | Change |
|---|---|
| `frontend/src/routes/_reader/reader.$translationId.tsx:46-58` | Boundary check: `totalPages - step` |
| `frontend/src/routes/_reader/reader.$translationId.tsx:74-83` | Landing: even-page `- 2` for double mode |

## Verification

- `npm run build` — typecheck passes
- Manual: navigate chapters in double mode, verify no ghost half-spreads
