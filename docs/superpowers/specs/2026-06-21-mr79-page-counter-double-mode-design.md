# MR79: Fix Page Counter for Double Mode — Design Spec

## Goal

Show range-based page counter (e.g., "1-2 / 5") in double-page display mode instead of single page index ("1 / 5").

## Approach: Add `displayMode` prop to PageIndicator

Single file change to `frontend/src/components/reader/PageViewer.tsx`. The `PageIndicator` component gets an optional `displayMode` prop. In double mode, when a spread shows two pages, the label shows a range. When the last page is alone (odd-length chapter), it shows a single number.

### Logic

```tsx
function PageIndicator({
  current,
  total,
  displayMode,
}: {
  current: number
  total: number
  displayMode?: 'single' | 'double'
}) {
  const isDouble = displayMode === 'double'
  const right = Math.min(current + 2, total)
  const label = !isDouble || current + 1 === total || right === current + 1
    ? `${current + 1} / ${total}`
    : `${current + 1}-${right} / ${total}`

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none select-none">
      {label}
    </div>
  )
}
```

Pass `displayMode` in `PageViewer`:

```tsx
<PageIndicator current={clampedPage} total={pages.length} displayMode={displayMode} />
```

### Label behavior

| currentPage | totalPages | displayMode | Shows |
|---|---|---|---|
| 0 | 5 | double | 1-2 / 5 |
| 2 | 5 | double | 3-4 / 5 |
| 4 | 5 | double | 5 / 5 |
| 0 | 4 | double | 1-2 / 4 |
| 2 | 4 | double | 3-4 / 4 |
| 1 | 3 | single | 2 / 3 (unchanged) |

### Edge cases

- **displayMode === undefined**: defaults to single format (backward compatible)
- **Last page alone** (odd total, last spread): `current + 1 === total` → single number
- **`right === current + 1`** (only one page to show): same guard

## File Changes

| File | Change |
|---|---|
| `frontend/src/components/reader/PageViewer.tsx` | Add `displayMode` prop to `PageIndicator`, pass from `PageViewer` |

## Verification

- `npm run build` — typecheck passes
- Manual: open reader in double mode, verify counter shows ranges
- Manual: open reader in single mode, verify counter unchanged
