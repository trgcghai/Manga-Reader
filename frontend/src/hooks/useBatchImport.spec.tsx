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

vi.mock('sonner', () => {
  const toastFn = vi.fn()
  toastFn.loading = vi.fn()
  toastFn.success = vi.fn()
  toastFn.warning = vi.fn()
  toastFn.error = vi.fn()
  return { default: toastFn, toast: toastFn }
})

// eslint-disable-next-line import/first
import { uploadTranslation } from '#/services/api/fileApi'
// eslint-disable-next-line import/first
import { createChapter } from '#/services/api/mangaApi'
// eslint-disable-next-line import/first
import type { Mock } from 'vitest'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useBatchImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(uploadTranslation as Mock).mockResolvedValue({
      key: 'k',
      url: 'http://minio/test',
    })
    ;(createChapter as Mock).mockResolvedValue(undefined)
  })

  it('returns initial idle state', () => {
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })
    expect(result.current.progress).toEqual({
      total: 0,
      completed: 0,
      failed: 0,
    })
    expect(result.current.isRunning).toBe(false)
  })

  function makeParsed(
    name: string,
    chapterNumber: number | null,
  ): { file: File; chapterNumber: number | null } {
    return { file: new File([''], name, { type: 'application/zip' }), chapterNumber }
  }

  it('processes files sequentially', async () => {
    const files = [
      makeParsed('ch1.cbz', 1),
      makeParsed('ch2.cbz', 2),
    ]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(2))
    expect(uploadTranslation).toHaveBeenCalledTimes(2)
    expect(createChapter).toHaveBeenCalledTimes(2)
    expect((uploadTranslation as Mock).mock.calls[0][1]).toBe(1)
    expect((createChapter as Mock).mock.calls[0][0]).toBe(1)
  })

  it('updates progress on each successful file', async () => {
    const files = [
      makeParsed('ch1.cbz', 1),
      makeParsed('ch2.cbz', 2),
    ]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(2))
    expect(result.current.progress.total).toBe(2)
    expect(result.current.progress.failed).toBe(0)
  })

  it('skips files with unparseable filenames', async () => {
    const files = [
      makeParsed('ch1.cbz', 1),
      makeParsed('readme.txt', null),
    ]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

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
      makeParsed('ch1.cbz', 1),
      makeParsed('ch2.cbz', 2),
    ]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

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
      makeParsed('ch1.cbz', 1),
      makeParsed('ch2.cbz', 2),
    ]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(result.current.progress.failed).toBe(1)
    expect(uploadTranslation).toHaveBeenCalledTimes(2)
  })

  it('shows toast on empty files array', async () => {
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate([], { languageId: 1, translatorId: 2 })
    })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('No files to import'),
    )
    expect(result.current.progress.total).toBe(0)
  })

  it('ignores concurrent mutate calls while running', async () => {
    ;(uploadTranslation as Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ key: 'k', url: 'u' }), 50),
        ),
    )
    const files = [makeParsed('ch1.cbz', 1)]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })
    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.progress.completed).toBe(1))
    expect(uploadTranslation).toHaveBeenCalledTimes(1)
  })

  it('shows loading toast at start and final summary toast at end', async () => {
    const files = [makeParsed('ch1.cbz', 1)]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

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
    const files = [makeParsed('ch1.cbz', 1)]
    const { result } = renderHook(() => useBatchImport(1), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(files, { languageId: 1, translatorId: 2 })
    })

    await waitFor(() => expect(result.current.isRunning).toBe(false))
    expect(result.current.progress.completed).toBe(1)
  })
})
