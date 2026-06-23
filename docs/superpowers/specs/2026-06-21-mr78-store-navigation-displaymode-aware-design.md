# MR78: Make Store Navigation displayMode-Aware — Design Spec

## Goal

Make `nextPage()` / `prevPage()` in the Zustand reader store advance `currentPage` by 2 when `displayMode === 'double'`, so navigation skips full spreads instead of showing overlapping pages.

## Approach: Inline step in `set()` callback

Read `state.displayMode` inside the existing `set` closure. No new actions, no API surface change.

### Logic

```ts
nextPage: () =>
  set((state) => ({
    currentPage:
      state.totalPages === 0
        ? state.currentPage
        : Math.min(
            state.currentPage + (state.displayMode === 'double' ? 2 : 1),
            state.totalPages - 1,
          ),
  })),

prevPage: () =>
  set((state) => ({
    currentPage: Math.max(
      state.currentPage - (state.displayMode === 'double' ? 2 : 1),
      0,
    ),
  })),
```

### Behavior table (4-page chapter)

| Mode | Action | currentPage before | currentPage after | Pages visible |
|------|--------|-------------------|-------------------|---------------|
| single | next | 0 | 1 | [2] |
| single | next | 1 | 2 | [3] |
| single | next | 2 | 3 | [4] |
| double | next | 0 | 2 | [3,4] |
| double | next | 2 | clamped to 3 | [4] alone → boundary triggers chapter advance |
| double | prev | 2 | 0 | [1,2] |

### Edge cases

- **totalPages === 0**: early return preserves `currentPage`
- **totalPages === 1**: step 1 or 2 both clamp to 0
- **Odd page count**: last page alone works correctly in both modes
- **Boundary**: the route's `handleNextPage` boundary check catches the last page via `currentPage < totalPages - step` (handled in MR80)

## File Changes

| File | Change |
|---|---|
| `frontend/src/stores/rootStore.ts:66-77` | Modify `nextPage` and `prevPage` to use dynamic step |

## Verification

- `npm run build` — typecheck
- `npm run test` — existing suite passes (no store tests, but consumers shouldn't be affected)
