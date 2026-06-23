# MR76: Chapter Boundary Navigation — Design Spec

## Goal

When the reader is at the first or last page of a chapter, navigation actions (keyboard arrows/Space + mouse click zones) should cross to the adjacent chapter's translation instead of doing nothing. If no adjacent chapter exists, show a toast.

## Design Decision: Route-Level Wrappers (Approach 1)

All boundary logic lives in the route component (`reader.$translationId.tsx`) as two `useCallback`-wrapped functions. These replace the raw store actions passed to both `PageViewer` and `useReaderKeyboard`.

No changes needed to `useReaderKeyboard` or `PageViewer` — they just call whatever function they're given.

## Logic

```
handleNextPage():
  if currentPage < totalPages - 1 → store.nextPage()
  else if data.nextTranslationId  → navigate('/reader/{nextTranslationId}')
  else                             → toast.info('This is the latest chapter')

handlePrevPage():
  if currentPage > 0              → store.prevPage()
  else if data.prevTranslationId  → navigate('/reader/{prevTranslationId}')
  else                             → toast.info('This is the first chapter')
```

## File Changes

| File | Change |
|---|---|
| `frontend/src/routes/_reader/reader.$translationId.tsx` | Add `useNavigate`, `useCallback`, `toast` imports; create `handleNextPage`/`handlePrevPage`; pass to PageViewer + useReaderKeyboard |
| `tasks/MR76.md` | (meta) Update to reflect route-level approach |

## Testing

- `npm run build` — typecheck catches any misuse
- `npm run test` — existing suite continues to pass
- Manual verification in browser

## Edge Cases

- **totalPages === 0**: `enabled: pages.length > 0` prevents the keyboard hook from firing; click zones are rendered after `pages.length === 0` guard
- **Double-page display mode**: `currentPage >= totalPages - 1` check works the same — last reachable page triggers boundary
- **Space key**: Already mapped to `onNextPage` in the keyboard hook, so Space at boundary behaves identically to ArrowRight

## Dependencies

- `useNavigate` from `@tanstack/react-router`
- `useCallback` from `react`
- `toast` from `sonner` (already imported in the codebase)
- `data.prevTranslationId` / `data.nextTranslationId` from MR74 (already available on `TranslationDetailResponse`)
