# MR88: Reader Page Jump Select

## Overview

Add a "Jump to Page" `<Select>` dropdown in `ReaderSettingsSheet` that appears only in page mode, allowing quick navigation to any page or spread.

## Store Reads

Add to existing `useReaderStore` selectors in `ReaderSettingsSheet`:
- `currentPage` — current page index
- `totalPages` — total number of pages
- `setCurrentPage` — action to navigate to a page index

## Page Items Utility

Pure function at module level, outside the component:

- **Single mode**: each page is an item labeled "1", "2", "3", ...
- **Double mode**: pages grouped into spreads labeled "1-2", "3-4", "5" (lone last page if odd count)
- Value = page index (0-based), Label = 1-based display

## Component Placement

Inserted after the Jump to Chapter section, before the Display Mode section.

```
Jump to Chapter: [Select ▼]
────────────────────
Jump to Page: [Select ▼]    ← NEW (only in page mode)
────────────────────
Display Mode: [Single | Double]
────────────────────
Reading Mode: [Page | Scroll]
────────────────────
Navigation: ...
```

## Default Value

The Select's `value` is bound to `String(currentPage)` — the current page index is always the selected/default item. Changing display mode while the sheet is open causes items to recompute and the Select to re-render with the correct current spread selected.

## Condition

Section renders only when `readingMode === 'page' && totalPages > 0`.

## Files Changed

| File | Action |
|------|--------|
| `frontend/src/components/reader/ReaderSettingsSheet.tsx` | Add `getPageItems` function, store reads, JSX section |
