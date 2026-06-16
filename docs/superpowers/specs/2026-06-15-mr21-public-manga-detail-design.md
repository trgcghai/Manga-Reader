# MR21 — Public Manga Detail Page Design

## Overview

Create a public-facing manga detail page at `/_app/manga/$mangaId` that shows the cover image, full metadata, and an ordered chapter list with translation details. This is the landing page after clicking a MangaCard in the library grid. The chapter reader comes in a separate MR.

---

## Route

`/_app/manga/$mangaId` → file `frontend/src/routes/_app/manga/$id.tsx`

Uses the existing `_app.tsx` pathless layout (AppHeader + AppFooter). No new layout needed.

Run `npm run generate-routes` after creating the route file (or `npm run dev` auto-generates it).

## Navigation

- **Library grid (`_app/index.tsx`)**: Wrap `MangaCard` in `<Link to="/_app/manga/$mangaId" params={{ id: String(manga.id) }}>`
- **Detail page**: "Back to Library" `<Link>` at the top returning to `/`

## Data

Hook: `useManga(id, { include: 'chapters,translations' })` returns `MangaDetailResponse | null`. When the manga doesn't exist, the backend returns `null` (not a 404), so the query succeeds with `data = null` — distinguish not-found with `!data && !isLoading && !isError`.

```ts
export interface MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetail[]
}
```

Chapters already sorted by `number` ascending on the backend.

## Components

### `MangaDetailHeader` — `frontend/src/components/manga/MangaDetailHeader.tsx`

Props: `manga: MangaDetailResponse`

Layout — two-column on `md+`, stacked on mobile:

**Left column (md: w-72, shrink-0)**:
- Cover image: `rounded-xl shadow-md aspect-[3/4] object-cover`
- Or placeholder `BookOpen` icon if no coverPath

**Right column**:
- **Title row**: `h1` with `font-serif` + status `Badge` (using `getStatusVariant`)
- **Authors**: `Badge variant="secondary"` for each
- **Genres**: `Badge variant="secondary"` for each
- **Description**: `<p>` text block, preserve whitespace
- **Alternative Titles**: comma-separated string or "-" if empty

### `ChapterList` — `frontend/src/components/manga/ChapterList.tsx`

Props: `chapters: ChapterDetail[]`

- Heading: "Chapters" (h2)
- Each chapter rendered as a `rounded-lg border` card with:
  - **Left**: Chapter number in `font-mono` (e.g., "#1")
  - **Right**: Chapter title (if present) + translation lines below
  - Each translation: `{language.name} by {translator.name}` in `text-sm text-muted-foreground`
  - Multiple translations per chapter shown as a stacked list
- Chapters ordered by `number` ascending
- Empty state: `<Empty>` component with "No chapters yet" message

## Page States

| State | Behavior |
|-------|----------|
| Loading | Skeleton: cover placeholder (aspect-3/4, ~w-72) + 3 text skeleton lines + 3 chapter row skeleton cards |
| Error | `<ErrorDisplay>` with retry button. "Back to Library" link still visible. |
| Not found | Query succeeds but data is `null` (backend returns null for missing manga when `include` is set). Show "Manga not found" with a link back to library. |
| Empty chapters | Metadata displayed normally, `<Empty>` component below with "No chapters yet" |
| Happy path | Full layout with cover, metadata, and chapter list |

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/routes/_app/manga/$id.tsx` | **Create** — route + page component with data fetching and states |
| `frontend/src/components/manga/MangaDetailHeader.tsx` | **Create** — cover + metadata component |
| `frontend/src/components/manga/ChapterList.tsx` | **Create** — chapter list with translations |
| `frontend/src/routes/_app/index.tsx` | Change — wrap MangaCard in Link to detail page |
