# MR66: CBZ Parsing and Basic Page Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download CBZ files from the backend, extract page images client-side, and render them in a page viewer with single/double display modes.

**Architecture:** Pure utility functions (`cbzParser.ts`) handle CBZ extraction and object URL management. A React hook (`useReaderPages`) orchestrates download via `useFileDownload().mutateAsync` + parsing. A presentational component (`PageViewer`) renders images with click zones, broken image placeholders, and a page indicator. The reader route wires them together.

**Tech Stack:** JSZip, zustand (`useReaderStore`), TanStack Query (`useFileDownload`), Vitest + React Testing Library

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/src/utils/cbzParser.ts` | `parseCbzPages`, `loadCbzAsObjectUrls`, `revokeObjectUrls` — pure functions, no React |
| `frontend/src/__tests__/cbzParser.spec.ts` | Unit tests for cbzParser |
| `frontend/src/hooks/useReaderPages.ts` | Hook: download CBZ via `useFileDownload`, parse, return object URLs |
| `frontend/src/__tests__/useReaderPages.spec.ts` | Unit tests for useReaderPages |
| `frontend/src/components/reader/PageViewer.tsx` | Component: renders images, click zones, broken image placeholder, page indicator |
| `frontend/src/__tests__/PageViewer.spec.tsx` | Component tests for PageViewer |
| `frontend/src/routes/_reader/reader.$translationId.tsx` | Route: wire `useReaderPages` + `PageViewer` + store |

---

### Task 1: Install JSZip

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install jszip**

Run from `frontend/`:

```bash
npm install jszip
```

Expected: `jszip` added to `dependencies` in `package.json` and `node_modules/jszip` exists.

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: install jszip for CBZ parsing"
```

---

### Task 2: Write and pass tests for cbzParser

**Files:**
- Create: `frontend/src/__tests__/cbzParser.spec.ts`
- Create: `frontend/src/utils/cbzParser.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/src/__tests__/cbzParser.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

describe('parseCbzPages', () => {
  async function createMockCbz(files: Record<string, string>): Promise<ArrayBuffer> {
    const zip = new JSZip()
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content)
    }
    return await zip.generateAsync({ type: 'arraybuffer' })
  }

  it('extracts and sorts image files by name', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      'page03.jpg': 'image-data-3',
      'page01.jpg': 'image-data-1',
      'page02.jpg': 'image-data-2',
      'notes.txt': 'not an image',
    })
    const result = await parseCbzPages(buffer)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('image/jpeg')
  })

  it('filters to jpg, jpeg, png, webp only', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      '1.jpg': 'a',
      '2.jpeg': 'b',
      '3.png': 'c',
      '4.webp': 'd',
      '5.gif': 'e',
      '6.bmp': 'f',
      'readme.txt': 'g',
    })
    const result = await parseCbzPages(buffer)
    expect(result).toHaveLength(4)
  })

  it('sorts pages in natural numeric order', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      'page10.jpg': '10',
      'page2.jpg': '2',
      'page1.jpg': '1',
      'page20.jpg': '20',
    })
    const result = await parseCbzPages(buffer)
    const names = result.map(b => b.size) // size as proxy for content
    expect(names).toEqual([1, 2, 10, 20]) // by byte length, 1='1' etc.
  })

  it('throws if no image files found', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({ 'readme.txt': 'hello' })
    await expect(parseCbzPages(buffer)).rejects.toThrow('No valid page images found in CBZ file')
  })

  it('handles empty CBZ', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const zip = new JSZip()
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseCbzPages(buffer)).rejects.toThrow('No valid page images found in CBZ file')
  })
})

describe('loadCbzAsObjectUrls and revokeObjectUrls', () => {
  let createdUrls: string[] = []

  beforeEach(() => {
    createdUrls = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:mock/${createdUrls.length}`
      createdUrls.push(url)
      return url
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('creates object URLs for each blob', async () => {
    const { loadCbzAsObjectUrls } = await import('#/utils/cbzParser')
    const blobs = [new Blob(['a']), new Blob(['b'])]
    const urls = loadCbzAsObjectUrls(blobs)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toMatch(/^blob:/)
  })

  it('revokes object URLs', async () => {
    const { revokeObjectUrls } = await import('#/utils/cbzParser')
    revokeObjectUrls(['blob:1', 'blob:2'])
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/cbzParser.spec.ts
```

Expected: FAIL — `import` errors because `cbzParser.ts` doesn't exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// frontend/src/utils/cbzParser.ts
import JSZip from 'jszip'

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i

function mimeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    default: return 'image/jpeg'
  }
}

export async function parseCbzPages(buffer: ArrayBuffer): Promise<Blob[]> {
  const zip = await JSZip.loadAsync(buffer)
  const entries = Object.entries(zip.files)
    .filter(([name, file]) => !file.dir && IMAGE_EXTENSIONS.test(name))
    .sort(([a], [b]) =>
      new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare(a, b),
    )

  if (entries.length === 0) {
    throw new Error('No valid page images found in CBZ file')
  }

  return await Promise.all(
    entries.map(async ([name, file]) => {
      const data = await file.async('blob')
      return new Blob([data], { type: mimeFromExtension(name) })
    }),
  )
}

export function loadCbzAsObjectUrls(blobs: Blob[]): string[] {
  return blobs.map(b => URL.createObjectURL(b))
}

export function revokeObjectUrls(urls: string[]): void {
  urls.forEach(u => URL.revokeObjectURL(u))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/cbzParser.spec.ts
```

Expected: PASS all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/__tests__/cbzParser.spec.ts frontend/src/utils/cbzParser.ts
git commit -m "feat: add cbzParser utility for CBZ extraction and object URL management"
```

---

### Task 3: Write and pass tests for useReaderPages hook

**Files:**
- Create: `frontend/src/__tests__/useReaderPages.spec.ts`
- Create: `frontend/src/hooks/useReaderPages.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/src/__tests__/useReaderPages.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock useFileDownload
const mockMutateAsync = vi.fn()
vi.mock('#/hooks/useFile', () => ({
  useFileDownload: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: vi.fn(),
  }),
}))

// Mock useReaderStore
const mockSetTotalPages = vi.fn()
vi.mock('#/stores/rootStore', () => ({
  useReaderStore: (selector?: (s: any) => any) => {
    const state = {
      setTotalPages: mockSetTotalPages,
      currentPage: 0,
      totalPages: 0,
    }
    return selector ? selector(state) : state
  },
  useReaderStore: {
    getState: () => ({
      setTotalPages: mockSetTotalPages,
    }),
  },
}))

// Mock cbzParser
vi.mock('#/utils/cbzParser', () => ({
  parseCbzPages: vi.fn(),
  loadCbzAsObjectUrls: vi.fn(),
  revokeObjectUrls: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useReaderPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading state initially', async () => {
    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns empty state when url is undefined', () => {
    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns pages and sets totalPages on success', async () => {
    const { parseCbzPages, loadCbzAsObjectUrls } = await import('#/utils/cbzParser')

    const fakeBlob = new Blob(['fake'], { type: 'image/jpeg' })
    vi.mocked(mockMutateAsync).mockResolvedValue(new Blob(['cbz-data']))
    vi.mocked(parseCbzPages).mockResolvedValue([fakeBlob])
    vi.mocked(loadCbzAsObjectUrls).mockReturnValue(['blob:mock/0'])

    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.pages).toEqual(['blob:mock/0'])
    expect(result.current.error).toBeNull()
    expect(mockSetTotalPages).toHaveBeenCalledWith(1)
  })

  it('returns error on download failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'))

    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBe('Network error')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/useReaderPages.spec.ts
```

Expected: FAIL — `useReaderPages` not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// frontend/src/hooks/useReaderPages.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { useFileDownload } from '#/hooks/useFile'
import { parseCbzPages, loadCbzAsObjectUrls, revokeObjectUrls } from '#/utils/cbzParser'
import { useReaderStore } from '#/stores/rootStore'

export function useReaderPages(url: string | undefined): {
  pages: string[]
  isLoading: boolean
  error: string | null
} {
  const [pages, setPages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync } = useFileDownload()
  const urlsRef = useRef<string[]>([])

  const cleanup = useCallback(() => {
    revokeObjectUrls(urlsRef.current)
    urlsRef.current = []
  }, [])

  useEffect(() => {
    if (!url) {
      cleanup()
      setPages([])
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      cleanup()
      setIsLoading(true)
      setError(null)

      try {
        const blob = await mutateAsync(url)
        const buffer = await blob.arrayBuffer()
        const imageBlobs = await parseCbzPages(buffer)
        const urls = loadCbzAsObjectUrls(imageBlobs)

        if (cancelled) {
          revokeObjectUrls(urls)
          return
        }

        urlsRef.current = urls
        setPages(urls)
        useReaderStore.getState().setTotalPages(imageBlobs.length)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load CBZ')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [url, mutateAsync, cleanup])

  return { pages, isLoading, error }
}
```

Note: the `useMutation` hook from `useFileDownload` doesn't support calling `mutateAsync` inside a `useEffect` the same way as before because mutations reset their state each time. Let me adjust the approach: instead of using `useFileDownload`, call `downloadFile` directly in the effect alongside the mutation's `mutateAsync`.

Actually, looking at this more carefully, `useFileDownload` is a `useMutation` hook. Calling `mutateAsync` inside a `useEffect` is fine. The mutation object stays stable across renders. Let me keep the implementation as-is but make sure the mock in the test works correctly.

Wait, the test mocks `useFileDownload` to return `{ mutateAsync: mockMutateAsync }` — but `useMutation` also has `isPending`, `reset`, etc. The test only provides `mutateAsync`. The component destructures just `mutateAsync` so that should work.

Let me re-examine the `useFileDownload` hook:
```ts
export function useFileDownload() {
  return useMutation<Blob, Error, string>({
    mutationFn: (url: string) => downloadFile(url),
  })
}
```

Yes, `useMutation` returns `{ mutateAsync, ... }`. The hook implementation destructures `{ mutateAsync }` which is correct.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useReaderPages.spec.ts
```

Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/__tests__/useReaderPages.spec.ts frontend/src/hooks/useReaderPages.ts
git commit -m "feat: add useReaderPages hook for CBZ download and parsing"
```

---

### Task 4: Write and pass tests for PageViewer component

**Files:**
- Create: `frontend/src/__tests__/PageViewer.spec.tsx`
- Create: `frontend/src/components/reader/PageViewer.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/src/__tests__/PageViewer.spec.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageViewer } from '#/components/reader/PageViewer'

const mockPages = ['blob:1', 'blob:2', 'blob:3']

function renderPageViewer(overrides = {}) {
  const props = {
    pages: mockPages,
    displayMode: 'single' as const,
    currentPage: 0,
    onNextPage: vi.fn(),
    onPrevPage: vi.fn(),
    ...overrides,
  }
  return { ...render(<PageViewer {...props} />), props }
}

describe('PageViewer — single mode', () => {
  it('renders the current page image', () => {
    renderPageViewer({ currentPage: 1 })
    const img = screen.getByAltText('Page 2')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'mockPages-1') // blob URLs get mocked
  })

  it('clamps out-of-bounds currentPage', () => {
    renderPageViewer({ currentPage: 100 })
    // Should render last page
    // In test we just verify it renders without crash
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders nothing when pages is empty', () => {
    const { container } = render(<PageViewer pages={[]} displayMode="single" currentPage={0} onNextPage={vi.fn()} onPrevPage={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows page indicator at bottom center', () => {
    renderPageViewer({ currentPage: 1 })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('calls onPrevPage when left third is clicked', async () => {
    const { props } = renderPageViewer()
    const container = screen.getByTestId('page-viewer-container')
    // Mock clientX within left third
    Object.defineProperty(container, 'clientWidth', { value: 900 })
    fireEvent.click(container, { clientX: 100 })
    expect(props.onPrevPage).toHaveBeenCalledTimes(1)
  })

  it('calls onNextPage when right third is clicked', async () => {
    const { props } = renderPageViewer()
    const container = screen.getByTestId('page-viewer-container')
    Object.defineProperty(container, 'clientWidth', { value: 900 })
    fireEvent.click(container, { clientX: 800 })
    expect(props.onNextPage).toHaveBeenCalledTimes(1)
  })

  it('does nothing when middle third is clicked', async () => {
    const { props } = renderPageViewer()
    const container = screen.getByTestId('page-viewer-container')
    Object.defineProperty(container, 'clientWidth', { value: 900 })
    fireEvent.click(container, { clientX: 450 })
    expect(props.onPrevPage).not.toHaveBeenCalled()
    expect(props.onNextPage).not.toHaveBeenCalled()
  })
})

describe('PageViewer — double mode', () => {
  it('renders two images side by side', () => {
    renderPageViewer({ displayMode: 'double', currentPage: 0 })
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('alt', 'Page 1')
    expect(imgs[1]).toHaveAttribute('alt', 'Page 2')
  })

  it('renders single image on last odd page', () => {
    renderPageViewer({ displayMode: 'double', currentPage: 2, pages: ['b:1', 'b:2', 'b:3'] })
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(1) // only page 3
    expect(imgs[0]).toHaveAttribute('alt', 'Page 3')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/PageViewer.spec.tsx
```

Expected: FAIL — `PageViewer` not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// frontend/src/components/reader/PageViewer.tsx
import { useState } from 'react'

interface PageViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  currentPage: number
  onNextPage: () => void
  onPrevPage: () => void
}

function PageIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none">
      {current + 1} / {total}
    </div>
  )
}

export function PageViewer({ pages, displayMode, currentPage, onNextPage, onPrevPage }: PageViewerProps) {
  const [errored, setErrored] = useState<Set<number>>(new Set())

  if (pages.length === 0) return null

  const clampedPage = Math.min(currentPage, pages.length - 1)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const third = rect.width / 3

    if (x < third) {
      onPrevPage()
    } else if (x > third * 2) {
      onNextPage()
    }
  }

  function handleImgError(index: number) {
    setErrored(prev => new Set(prev).add(index))
  }

  function renderImage(index: number) {
    if (errored.has(index)) {
      return (
        <div
          key={`placeholder-${index}`}
          className="flex items-center justify-center bg-zinc-800 text-zinc-400 max-h-screen max-w-full aspect-[3/4]"
          data-testid={`page-placeholder-${index}`}
        >
          Page {index + 1}
        </div>
      )
    }
    return (
      <img
        key={`img-${index}`}
        src={pages[index]}
        alt={`Page ${index + 1}`}
        className={displayMode === 'single' ? 'max-h-screen max-w-full object-contain' : 'max-h-screen max-w-[50vw] object-contain'}
        onError={() => handleImgError(index)}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center h-full relative"
      onClick={handleClick}
      data-testid="page-viewer-container"
    >
      {displayMode === 'single' ? (
        renderImage(clampedPage)
      ) : (
        <div className="flex items-center justify-center gap-1 h-full">
          {renderImage(clampedPage)}
          {clampedPage + 1 < pages.length ? renderImage(clampedPage + 1) : <div className="w-[50vw]" />}
        </div>
      )}
      <PageIndicator current={clampedPage} total={pages.length} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/PageViewer.spec.tsx
```

Expected: PASS all 10 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/__tests__/PageViewer.spec.tsx frontend/src/components/reader/PageViewer.tsx
git commit -m "feat: add PageViewer component with single/double modes and click zones"
```

---

### Task 5: Integrate into reader route

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx`
- Verify: `cd frontend && npm run build`

- [ ] **Step 1: Update the reader route to wire useReaderPages and PageViewer**

```tsx
// frontend/src/routes/_reader/reader.$translationId.tsx
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useTranslation } from '#/hooks/useManga'
import { useReaderStore } from '#/stores/rootStore'
import { useReaderPages } from '#/hooks/useReaderPages'
import { PageViewer } from '#/components/reader/PageViewer'
import { Skeleton } from '#/components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_reader/reader/$translationId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { translationId } = useParams({ from: '/_reader/reader/$translationId' })
  const { data, isLoading, isError, refetch } = useTranslation(Number(translationId))

  const { currentPage, displayMode } = useReaderStore()
  const nextPage = useReaderStore(s => s.nextPage)
  const prevPage = useReaderStore(s => s.prevPage)

  const { pages, isLoading: pagesLoading, error: pagesError } = useReaderPages(data?.url)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-96">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Reader</ErrorTitle>
          <ErrorDescription>
            Could not fetch translation data. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()} variant="default">Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  if (pagesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-96">
          <Skeleton className="h-96 w-full" />
          <p className="text-center text-zinc-500 text-sm">Loading pages...</p>
        </div>
      </div>
    )
  }

  if (pagesError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Pages</ErrorTitle>
          <ErrorDescription>{pagesError}</ErrorDescription>
          <Button onClick={() => refetch()} variant="default">Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div className="relative h-screen">
      <PageViewer
        pages={pages}
        displayMode={displayMode}
        currentPage={currentPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
      />
      <div className="absolute top-4 left-4 text-sm text-zinc-400 bg-black/50 px-2 py-1 rounded pointer-events-none">
        {data.chapter.manga.title} — Ch. {data.chapter.number}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify no errors**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/_reader/reader.$translationId.tsx
git commit -m "feat: integrate CBZ page viewer into reader route"
```

---

## Self-Review

1. **Spec coverage**: All spec requirements covered:
   - Task 1: Install JSZip ✓
   - Task 2: cbzParser with all 3 functions ✓
   - Task 3: useReaderPages hook using useFileDownload ✓
   - Task 4: PageViewer with single/double mode, click zones, placeholder, page indicator ✓
   - Task 5: Integration into reader route ✓

2. **Placeholder scan**: No TBDs, TODOs, or vague "handle errors" steps. All code is concrete.

3. **Type consistency**: `useReaderPages` returns `{ pages, isLoading, error }` matching `PageViewer` props. Store methods match existing `rootStore.ts`. All consistent.

4. **Scope check**: Focused on MR66 only. Keyboard nav, scroll mode, persistence explicitly excluded.
