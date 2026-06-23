# MR66: Frontend — CBZ Parsing and Basic Page Rendering

## Objective

Download CBZ files from the backend, extract page images client-side, and render them in a page viewer with single/double display modes, click zones, broken image placeholders, and a page indicator.

## Architecture

```
reader.$translationId.tsx
  ├── useTranslation(id)         → gets TranslationDetailResponse with CBZ url
  ├── useReaderPages(url)        → orchestrates download → parse → object URLs
  │     ├── useFileDownload()    → mutateAsync(url) → Blob
  │     └── cbzParser.ts         → parseCbzPages(), loadCbzAsObjectUrls(), revokeObjectUrls()
  ├── useReaderStore             → currentPage, displayMode, nextPage(), prevPage()
  └── PageViewer                 → renders images with click zones + page indicator
```

## Data Flow

1. Reader route loads translation via `useTranslation(translationId)` → gets `data.url`
2. `useReaderPages(data.url)` runs a `useEffect`:
   - Calls `mutateAsync(url)` from `useFileDownload()` → returns `Blob`
   - Converts `Blob` → `ArrayBuffer` via `blob.arrayBuffer()`
   - Calls `parseCbzPages(buffer)` → filters + sorts images → returns `Blob[]`
   - Calls `loadCbzAsObjectUrls(blobs)` → creates object URLs → returns `string[]`
   - Updates store: `useReaderStore.getState().setTotalPages(blobs.length)`
3. Returns `{ pages, isLoading, error }` to the route
4. Route renders `<PageViewer>` with pages, display mode, current page, and callbacks

## Files

### `frontend/src/utils/cbzParser.ts`

Pure utility functions. No React, no side effects (except `URL.createObjectURL` / `URL.revokeObjectURL`). Easily unit-testable.

- **`parseCbzPages(buffer: ArrayBuffer): Promise<Blob[]>`**
  - Imports `JSZip` from `jszip`
  - `await new JSZip().loadAsync(buffer)`
  - Filters `Object.entries(zip.files)` where file names match `\.(jpg|jpeg|png|webp)$` (case-insensitive) and `!dir` (not directories)
  - Sorts by filename using `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare`
  - Maps each entry to a `Blob` with MIME type: `.jpg`/`.jpeg` → `image/jpeg`, `.png` → `image/png`, `.webp` → `image/webp`
  - Throws `new Error('No valid page images found in CBZ file')` if no images found
- **`loadCbzAsObjectUrls(blobs: Blob[]): string[]`**
  - `return blobs.map(b => URL.createObjectURL(b))`
- **`revokeObjectUrls(urls: string[]): void`**
  - `urls.forEach(u => URL.revokeObjectURL(u))`

### `frontend/src/hooks/useReaderPages.ts`

Custom hook that manages the download → parse → URL lifecycle.

- **Signature**: `export function useReaderPages(url: string | undefined): { pages: string[], isLoading: boolean, error: string | null }`
- **Internals**:
  - `const { mutateAsync } = useFileDownload()` from `#/hooks/useFile`
  - `useState` for `pages: string[]`, `isLoading: boolean`, `error: string | null`
  - `useRef<string[]>([])` to track current object URLs for cleanup
  - Primary `useEffect` (runs on `url` change):
    - Guard: `if (!url)` → set `pages = []`, `isLoading = false`, `error = null`, return
    - Revoke previous object URLs from ref
    - Set `isLoading = true`, `error = null`
    - `try { const blob = await mutateAsync(url); const buffer = await blob.arrayBuffer(); const imageBlobs = await parseCbzPages(buffer); const urls = loadCbzAsObjectUrls(imageBlobs); useReaderStore.getState().setTotalPages(imageBlobs.length); ref.current = urls; setPages(urls); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load CBZ'); }`
    - `finally { setIsLoading(false); }`
  - Cleanup `useEffect` (runs on unmount): calls `revokeObjectUrls(ref.current)`
  - Returns `{ pages, isLoading, error }`

### `frontend/src/components/reader/PageViewer.tsx`

Presentational component.

- **Props**:
  ```ts
  interface PageViewerProps {
    pages: string[]
    displayMode: 'single' | 'double'
    currentPage: number
    onNextPage: () => void
    onPrevPage: () => void
  }
  ```
- **Single mode** (`displayMode === 'single'`):
  ```tsx
  <div className="flex items-center justify-center h-full relative" onClick={handleClick}>
    <img src={pages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-screen max-w-full object-contain" onError={handleImgError} />
    <PageIndicator current={currentPage} total={pages.length} />
  </div>
  ```
- **Double mode** (`displayMode === 'double'`):
  ```tsx
  <div className="flex items-center justify-center gap-1 h-full relative" onClick={handleClick}>
    {/* left page */}
    <img src={pages[currentPage]} alt={`Page ${currentPage + 1}`} className="max-h-screen max-w-[50vw] object-contain" onError={handleImgError} />
    {/* right page (if exists) */}
    {pages[currentPage + 1] && (
      <img src={pages[currentPage + 1]} alt={`Page ${currentPage + 2}`} className="max-h-screen max-w-[50vw] object-contain" onError={handleImgError} />
    )}
    {!pages[currentPage + 1] && <div className="w-[50vw]" /> /* empty space for odd last page */}
    <PageIndicator current={currentPage} total={pages.length} />
  </div>
  ```
- **Click zones**: `handleClick` checks `event.clientX / window.innerWidth`. Left third → `onPrevPage()`. Right third → `onNextPage()`. Middle third → no-op.
- **Broken images**: `handleImgError` replaces the `<img>` with a placeholder `<div className="flex items-center justify-center bg-zinc-800 text-zinc-400 max-h-screen max-w-full aspect-[3/4]">Page N</div>`. Uses a `useState` map to track errored image indices.
- **Page indicator**: Inline `PageIndicator` component:
  ```tsx
  function PageIndicator({ current, total }: { current: number; total: number }) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
        {current + 1} / {total}
      </div>
    )
  }
  ```
- **Edge cases**:
  - `pages.length === 0` → render `null`
  - `currentPage` out of bounds → clamped to `Math.min(currentPage, pages.length - 1)`
  - Image load errors → show placeholder (tracked per-index in state)

### `frontend/src/routes/_reader/reader.$translationId.tsx`

- **New imports**:
  ```ts
  import { useReaderStore } from '#/stores/rootStore'
  import { useReaderPages } from '#/hooks/useReaderPages'
  import { PageViewer } from '#/components/reader/PageViewer'
  ```
- **In `ReaderPage` function**:
  ```ts
  const { currentPage, displayMode } = useReaderStore()
  const nextPage = useReaderStore(s => s.nextPage)
  const prevPage = useReaderStore(s => s.prevPage)
  const { pages, isLoading: pagesLoading, error: pagesError } = useReaderPages(data?.url)
  ```
- **Loading state**: Keep existing `<Skeleton>` when `isLoading || pagesLoading`
- **Error state**: Existing `<ErrorDisplay>` also handles `pagesError`
- **Ready state**: Replace placeholder div with:
  ```tsx
  <div className="relative h-screen">
    <PageViewer pages={pages} displayMode={displayMode} currentPage={currentPage} onNextPage={nextPage} onPrevPage={prevPage} />
    <div className="absolute top-4 left-4 text-sm text-zinc-400 bg-black/50 px-2 py-1 rounded">
      {data.chapter.manga.title} — Ch. {data.chapter.number}
    </div>
  </div>
  ```

## Error Handling

| Scenario | Behavior |
|---|---|
| Network failure during download | `mutateAsync` throws → `error` state set, error display shown with retry |
| Empty CBZ / no images | `parseCbzPages` throws → caught in hook → error display |
| Corrupt CBZ (invalid ZIP) | JSZip throws on `loadAsync` → caught in hook → error display |
| Individual image load failure | `onError` swaps that `<img>` to a placeholder div |
| `pages` array empty | `PageViewer` renders `null` |

## Testing

- Unit test `cbzParser.ts`: mock JSZip, test filtering, sorting, MIME types, empty CBZ case
- Unit test `useReaderPages.ts`: mock `useFileDownload`, verify states transition correctly
- Component test `PageViewer.tsx`: render in single/double mode, click zones, broken image placeholder

## Out of Scope

- Keyboard navigation (MR67)
- Progress persistence (MR68)
- Scroll reading mode (MR67)
- Chapter prev/next navigation (MR67)
