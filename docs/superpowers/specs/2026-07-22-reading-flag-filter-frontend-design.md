# MR110 — Frontend readingFlag Filter in API + Hook

## Summary

Add typed `readingFlag` parameter support to `getAllMangas` API function and `useMangaList` hook, using a `ReadingFlagFilter` type that accepts `ReadingFlag` values or `'any'`.

## Design

### Type

In `mangaApi.ts`, add:

```typescript
export type ReadingFlagFilter = ReadingFlag | 'any'
```

### API Function

Add `readingFlag?: ReadingFlagFilter` to `getAllMangas` params. Pass it as a query param when provided.

### Query Key

Add `readingFlag` to `mangaKeys.list` params type and tuple so cache is properly invalidated when the filter changes.

### Hook

Add `readingFlag?: ReadingFlagFilter` to `useMangaList` params. Pass through to `getAllMangas`.

## Files Changed

- `frontend/src/services/api/mangaApi.ts` — add `ReadingFlagFilter` type, update `getAllMangas` params
- `frontend/src/hooks/useManga.ts` — update `mangaKeys.list` params + `useMangaList` params
