# MR64 + MR65: Reader Store and Route

## Summary

Two sequential tasks: install Zustand and create a reader store (MR64), then build the reader layout, route, and API hook (MR65). Together they enable the reader page to fetch and display translation data via `/reader/$translationId`.

## Architecture

```
MR64:
zustand → stores/rootStore.ts (translationSlice) → useReaderStore hook

MR65:
_reader.tsx (layout, full-screen, dark bg) → reader.$translationId.tsx
    │
    ├─ useParams → translationId
    ├─ useTranslation(id) → useQuery
    └─ renders loading / error / data states
```

## Files

### MR64

| File | Action |
|------|--------|
| `frontend/package.json` | Add `zustand` dependency |
| `frontend/src/stores/rootStore.ts` | Create with `create` + `translationSlice` using `StateCreator` pattern |

### MR65

| File | Action |
|------|--------|
| `frontend/src/services/api/mangaApi.ts` | Add `getTranslation(id)` API function |
| `frontend/src/types/translation.ts` | Create `TranslationDetailResponse` type |
| `frontend/src/hooks/useManga.ts` | Add `useTranslation(id)` hook |
| `frontend/src/routes/_reader.tsx` | Create layout route (full-screen, dark, `<Outlet />`) |
| `frontend/src/routes/_reader/reader.$translationId.tsx` | Create page route with loading/error/data |

## TranslationDetailResponse Type

```typescript
export interface TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
}
```

## Store Shape (MR64)

`useReaderStore` with `translationSlice`:

| Field | Type | Default |
|-------|------|---------|
| `currentTranslation` | `TranslationDetailResponse \| null` | `null` |
| `currentChapter` | `{ id, number, title?, mangaId, mangaTitle } \| null` | `null` |
| `currentPage` | `number` | `0` |
| `totalPages` | `number` | `0` |
| `readingMode` | `'page' \| 'scroll'` | `'page'` |
| `displayMode` | `'single' \| 'double'` | `'single'` |

Actions: `setCurrentTranslation(t)`, `setCurrentPage(n)`, `setTotalPages(n)`, `setReadingMode(m)`, `setDisplayMode(m)`, `nextPage()`, `prevPage()`, `reset()`.

`setCurrentTranslation` reads `t.chapter` to populate `currentChapter`.

## Data Flow

1. User navigates to `/reader/1`
2. `reader.$translationId.tsx` reads `translationId` from params
3. `useTranslation(1)` fires `GET /mangas/translations/1`
4. Returns `TranslationDetailResponse` with nested chapter/manga
5. Page renders loading skeleton → data (or error state)
6. Future: store integration wires response into `useReaderStore` (not part of these tasks)

## States

Three visual states per route spec: loading (skeleton), error (retry button), data (translation info displayed).
