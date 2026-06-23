# MR87: Reader Chapter Jump Select

## Overview

Add a "Jump to Chapter" `<Select>` dropdown to `ReaderSettingsSheet` that lists all chapters of the current manga and navigates to the selected chapter's translation.

## Store Wiring

In `reader.$translationId.tsx`, call `setCurrentTranslation(data)` via `useEffect` when `data` (from `useTranslation()`) is available:

```typescript
const setCurrentTranslation = useReaderStore((s) => s.setCurrentTranslation)

useEffect(() => {
  if (data) {
    setCurrentTranslation(data)
  }
}, [data, setCurrentTranslation])
```

This populates `currentChapter` (with `mangaId`) and `currentTranslation` (with `translator.id`, `language.code`) in the Zustand store, making them available to `ReaderSettingsSheet`.

## Type & API Function

In `mangaApi.ts`:

- **`ReaderChapterItem`** — interface with `chapterId`, `title`, `translationId`, `isFirstChapter`, `isLatestChapter`
- **`getReaderChapters(mangaId, translatorId, language)`** — calls `GET /mangas/reader/chapters` with query params, returns `ReaderChapterItem[]`

## Hook: `useReaderChapters`

In `useManga.ts`:

```typescript
useReaderChapters(mangaId, translatorId, language)
```

- Wraps `getReaderChapters` via `useQuery`
- Query key: `['manga', 'reader', 'chapters', mangaId, translatorId, language]`
- Enabled only when all three params are truthy (`mangaId > 0`, `translatorId > 0`, `language` set)

## Component: ReaderSettingsSheet

### Props & Store Reads
- Reads `currentChapter` and `currentTranslation` from `useReaderStore`
- If `currentChapter` is null, render nothing for the jump section

### Layout
```
[Manga Title]
───────────────
Jump to Chapter
[ Select dropdown ▼ ]
── shows "Loading..." while fetching
── current chapter disabled (user is already there)
── chapters without translationId are disabled
───────────────
Display Mode
...
```

### Behavior
- `handleJumpChapter(chapterId: string)`: find the chapter in the chapters array by `chapterId`, get its `translationId`, navigate via `navigate({ to: '/reader/$translationId', params: { translationId: String(selected.translationId) } })`
- Navigating to current chapter is a no-op (it's disabled anyway)
- On fetch error: render nothing (silent failure — non-critical feature)
- Empty state: render nothing (no chapters to jump to)

## Files Changed

| File | Action |
|------|--------|
| `frontend/src/services/api/mangaApi.ts` | Add `ReaderChapterItem` type + `getReaderChapters` function |
| `frontend/src/hooks/useManga.ts` | Add `useReaderChapters` hook + imports |
| `frontend/src/routes/_reader/reader.$translationId.tsx` | Add `useEffect` to call `setCurrentTranslation(data)` |
| `frontend/src/components/reader/ReaderSettingsSheet.tsx` | Add chapter jump Select section |
