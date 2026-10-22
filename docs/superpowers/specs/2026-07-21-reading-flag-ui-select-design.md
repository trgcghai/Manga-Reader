# MR108 — Frontend Reading Flag Select on Manga Detail Page

## Summary

Add a shadcn `<Select>` dropdown to the public manga detail page (`/manga/:id`) that lets the user set the reading flag. Uses `useUpdateMangaFlag` mutation directly inside `MangaDetailHeader`.

## Design

### Label utility — `getReadingFlagLabel`

In `mangaUtils.ts`, add a function that derives display labels from the `READING_FLAGS` const values:

```typescript
const getReadingFlagLabel = (flag: string): string =>
  flag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
```

Produces: `Reading`, `Re-reading`, `Planned`, `Completed`, `Paused`, `Dropped`

### Select placement

In `MangaDetailHeader.tsx`, add a new row below the status badge (after line 75). A `Bookmark` icon + a shadcn `<Select>` with:
- "None" option (value `""`, maps to `null`)
- 6 flag options from `READING_FLAGS` constant
- Disabled while mutation is pending
- `onValueChange` triggers `updateFlag.mutate({ mangaId, flag })`

### Mutation

`useUpdateMangaFlag()` called at the top of the component. No props or external wiring needed.

## Files Changed

- `frontend/src/lib/mangaUtils.ts` — add `getReadingFlagLabel` utility
- `frontend/src/components/manga/MangaDetailHeader.tsx` — add Select with mutation
