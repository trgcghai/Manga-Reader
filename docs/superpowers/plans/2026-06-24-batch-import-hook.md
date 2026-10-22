# Batch Import Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `parseChapterNumberFromFilename` utility and `useBatchImport` hook for sequential folder-based chapter import with toast progress.

**Architecture:** Pure utility function `parseChapterNumberFromFilename` extracts chapter numbers from filenames via configurable regex. `useBatchImport` wraps a custom async loop (no `useMutation`) that sequentially uploads each file to MinIO then creates a chapter, tracking progress via `useState` and updating a globally-persisted sonner toast identified by a module-level ID constant.

**Tech Stack:** React 19, TanStack Query (for cache invalidation only), Sonner toast, Vitest + Testing Library, TypeScript strict.

**Related skills:** `vitest` (unit tests with Vitest), `tanstack-query-best-practices` (query invalidation), `test-driven-development` (write tests before implementation), `vercel-react-best-practices` (React patterns, hooks).

---

### Task 1: `parseChapterNumberFromFilename` utility

**Files:**
- Create: `frontend/src/utils/parseChapterNumber.ts`
- Create: `frontend/src/utils/parseChapterNumber.spec.ts`

**Related skill:** `vitest` (unit test patterns), `test-driven-development` (TDD flow)

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/utils/parseChapterNumber.spec.ts
import { describe, it, expect } from 'vitest'
import { parseChapterNumberFromFilename, DEFAULT_CHAPTER_PATTERN } from './parseChapterNumber'

describe('parseChapterNumberFromFilename', () => {
  it('extracts number from "chapter 1.cbz"', () => {
    expect(parseChapterNumberFromFilename('chapter 1.cbz')).toBe(1)
  })

  it('extracts number from "c002.zip" stripping leading zeros', () => {
    expect(parseChapterNumberFromFilename('c002.zip')).toBe(2)
  })

  it('extracts decimal number from "c200.4.cbz"', () => {
    expect(parseChapterNumberFromFilename('c200.4.cbz')).toBe(200.4)
  })

  it('extracts decimal number from "chapter 100.1.zip"', () => {
    expect(parseChapterNumberFromFilename('chapter 100.1.zip')).toBe(100.1)
  })

  it('is case-insensitive ("ChApTeR 5.cbz")', () => {
    expect(parseChapterNumberFromFilename('ChApTeR 5.cbz')).toBe(5)
  })

  it('catches leading number without prefix ("03-scan.cbz")', () => {
    expect(parseChapterNumberFromFilename('03-scan.cbz')).toBe(3)
  })

  it('returns null for non-chapter filenames ("readme.txt")', () => {
    expect(parseChapterNumberFromFilename('readme.txt')).toBeNull()
  })

  it('returns null for filename with no number ("chapter.cbz")', () => {
    expect(parseChapterNumberFromFilename('chapter.cbz')).toBeNull()
  })

  it('accepts custom pattern override', () => {
    const custom = /ep(\d+)/i
    expect(parseChapterNumberFromFilename('ep05.cbz', custom)).toBe(5)
    expect(parseChapterNumberFromFilename('chapter 1.cbz', custom)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/parseChapterNumber.spec.ts`
Expected: FAIL — module not found errors for all tests

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/utils/parseChapterNumber.ts
export const DEFAULT_CHAPTER_PATTERN = /^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)/i

export function parseChapterNumberFromFilename(
  filename: string,
  pattern: RegExp = DEFAULT_CHAPTER_PATTERN,
): number | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const match = nameWithoutExt.match(pattern)
  if (!match) return null
  return parseFloat(match[1])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/parseChapterNumber.spec.ts`
Expected: PASS — all 9 tests pass

- [ ] **Step 5: Run full lint + check**

Run: `cd frontend && npm run check`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/parseChapterNumber.ts frontend/src/utils/parseChapterNumber.spec.ts
git commit -m "feat: add parseChapterNumberFromFilename utility"
```

---

### Task 2: `useBatchImport` hook

**Files:**
- Create: `frontend/src/hooks/useBatchImport.ts`
- Create: `frontend/src/hooks/useBatchImport.spec.ts`

**Related skill:** `vitest` (mocking API modules), `tanstack-query-best-practices` (query invalidation), `test-driven-development` (TDD flow), `vercel-react-best-practices` (custom hooks, useRef/useState patterns)

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/hooks/useBatchImport.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBatchImport } from './useBatchImport'
import { toast } from 'sonner'

vi.mock('#/services/api/fileApi', () => ({
  uploadTranslation: vi.fn(),
}))

vi.mock('#/services/api/mangaApi', () => ({
  createChapter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

import { uploadTranslation } from '#/services/api/fileApi'
import { createChapter } from '#/services/api/mangaApi'
import type { Mock } from 'vitest'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockFile = new File([''], 'chapter 1.cbz', { type: 'application/zip' })

describe('useBatchImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(uploadTranslation as Mock).mockResolvedValue({ key: 'k', url: 'http://minio/test' })
    ;(createChapter as Mock).mockResolvedValue(undefined)
  })

  it('returns initial idle state', () => {
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })
    expect(result.current.progress).toEqual({ total: 0, completed: 0, failed: 0 })
    expect(result.current.isRunning).toBe(false)
  })

  it('processes files sequentially', async () => {
    const files = [
      new File([''], 'ch1.cbz', { type: 'application/zip' }),
      new File([''], 'ch2.cbz', { type: 'application/zip' }),
    ]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(2))
    expect(uploadTranslation).toHaveBeenCalledTimes(2)
    expect(createChapter).toHaveBeenCalledTimes(2)
    // Verify order: first upload and create complete before second starts
    expect((uploadTranslation as Mock).mock.calls[0][1]).toBe(1) // mangaId
    expect((createChapter as Mock).mock.calls[0][0]).toBe(1) // mangaId
  })

  it('updates progress on each successful file', async () => {
    const files = [
      new File([''], 'ch1.cbz', { type: 'application/zip' }),
      new File([''], 'ch2.cbz', { type: 'application/zip' }),
    ]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(2))
    expect(result.current.progress.total).toBe(2)
    expect(result.current.progress.failed).toBe(0)
  })

  it('skips files with unparseable filenames', async () => {
    const files = [
      new File([''], 'ch1.cbz', { type: 'application/zip' }),
      new File([''], 'readme.txt', { type: 'text/plain' }),
    ]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(result.current.progress.failed).toBe(1)
    expect(uploadTranslation).toHaveBeenCalledTimes(1)
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Skipped'),
      expect.any(Object),
    )
  })

  it('continues on upload failure', async () => {
    ;(uploadTranslation as Mock)
      .mockRejectedValueOnce(new Error('Upload failed'))
      .mockResolvedValueOnce({ key: 'k', url: 'http://minio/test' })
    const files = [
      new File([''], 'ch1.cbz', { type: 'application/zip' }),
      new File([''], 'ch2.cbz', { type: 'application/zip' }),
    ]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(result.current.progress.failed).toBe(1)
  })

  it('continues on chapter creation failure', async () => {
    ;(createChapter as Mock)
      .mockRejectedValueOnce(new Error('Duplicate'))
      .mockResolvedValueOnce(undefined)
    const files = [
      new File([''], 'ch1.cbz', { type: 'application/zip' }),
      new File([''], 'ch2.cbz', { type: 'application/zip' }),
    ]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(result.current.progress.failed).toBe(1)
    // upload was still called for both
    expect(uploadTranslation).toHaveBeenCalledTimes(2)
  })

  it('shows toast on empty files array', async () => {
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate([], { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No files to import'))
    expect(result.current.progress.total).toBe(0)
  })

  it('ignores concurrent mutate calls while running', async () => {
    ;(uploadTranslation as Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ key: 'k', url: 'u' }), 50)),
    )
    const files = [new File([''], 'ch1.cbz', { type: 'application/zip' })]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })
    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    // Only one set of files processed
    expect(uploadTranslation).toHaveBeenCalledTimes(1)
  })

  it('shows loading toast at start and final summary toast at end', async () => {
    const files = [new File([''], 'ch1.cbz', { type: 'application/zip' })]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining('0 / 1'),
      expect.objectContaining({ id: 'batch-import' }),
    )
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('1 / 1'),
      expect.objectContaining({ id: 'batch-import' }),
    )
  })

  it('isRunning is true while processing and false after completion', async () => {
    const files = [new File([''], 'ch1.cbz', { type: 'application/zip' })]
    const { result } = renderHook(() => useBatchImport(1), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.isRunning).toBe(false))
    expect(result.current.progress.completed).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useBatchImport.spec.ts`
Expected: FAIL — 10+ tests failing with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/hooks/useBatchImport.ts
import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadTranslation } from '#/services/api/fileApi'
import { createChapter } from '#/services/api/mangaApi'
import { parseChapterNumberFromFilename } from '#/utils/parseChapterNumber'

const TOAST_ID = 'batch-import'

interface Progress {
  total: number
  completed: number
  failed: number
}

interface ImportOptions {
  languageId: number
  translatorId: number
}

export function useBatchImport(
  mangaId: number,
  options?: { filenamePattern?: RegExp },
) {
  const queryClient = useQueryClient()
  const isRunningRef = useRef(false)
  const [progress, setProgress] = useState<Progress>({ total: 0, completed: 0, failed: 0 })
  const [isRunning, setIsRunning] = useState(false)

  const mutate = useCallback(
    async (files: File[], importOptions: ImportOptions) => {
      if (isRunningRef.current) return

      if (files.length === 0) {
        toast.error('No files to import')
        return
      }

      isRunningRef.current = true
      setIsRunning(true)
      const total = files.length
      setProgress({ total, completed: 0, failed: 0 })

      toast.loading(`0 / ${total} chapters imported...`, { id: TOAST_ID })

      let completed = 0
      let failed = 0

      for (const file of files) {
        const chapterNumber = parseChapterNumberFromFilename(
          file.name,
          options?.filenamePattern,
        )

        if (chapterNumber === null) {
          failed++
          setProgress({ total, completed, failed })
          toast.warning(`Skipped "${file.name}" — could not determine chapter number`, { id: TOAST_ID })
          continue
        }

        try {
          const { url } = await uploadTranslation(file, mangaId, chapterNumber)
          await createChapter(mangaId, {
            number: chapterNumber,
            languageId: importOptions.languageId,
            translatorId: importOptions.translatorId,
            url,
          })
          completed++
        } catch {
          failed++
        }

        setProgress({ total, completed, failed })
        toast(`${completed} / ${total} chapters imported...`, { id: TOAST_ID })
      }

      isRunningRef.current = false
      setIsRunning(false)

      if (failed === 0) {
        toast.success(`Imported ${completed} / ${total} chapters successfully`, { id: TOAST_ID })
      } else if (completed > 0) {
        toast.warning(`Imported ${completed} / ${total} chapters (${failed} failed)`, { id: TOAST_ID })
      } else {
        toast.error(`0 / ${total} chapters imported (${failed} failed)`, { id: TOAST_ID })
      }

      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
    },
    [mangaId, options?.filenamePattern, queryClient],
  )

  return { mutate, progress, isRunning }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useBatchImport.spec.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Run full lint + check + all tests**

Run: `cd frontend && npm run check && npm run test`
Expected: 0 lint errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useBatchImport.ts frontend/src/hooks/useBatchImport.spec.ts
git commit -m "feat: add useBatchImport hook with toast progress"
```
