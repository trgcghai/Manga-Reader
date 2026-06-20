import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockMutateAsync = vi.fn()
vi.mock('#/hooks/useFile', () => ({
  useFileDownload: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: vi.fn(),
  }),
}))

const mockSetTotalPages = vi.fn()
vi.mock('#/stores/rootStore', () => ({
  useReaderStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = { setTotalPages: mockSetTotalPages, currentPage: 0, totalPages: 0 }
      return selector ? selector(state) : state
    },
    { getState: () => ({ setTotalPages: mockSetTotalPages }) }
  ),
}))

vi.mock('#/utils/cbzParser', () => ({
  parseCbzPages: vi.fn(),
  loadCbzAsObjectUrls: vi.fn(),
  revokeObjectUrls: vi.fn(),
}))

describe('useReaderPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading state initially', async () => {
    mockMutateAsync.mockImplementation(() => new Promise(() => {}))

    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns empty state when url is undefined', async () => {
    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages(undefined))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns pages and sets totalPages on success', async () => {
    const { parseCbzPages, loadCbzAsObjectUrls } = await import('#/utils/cbzParser')

    const fakeBlob = new Blob(['fake'], { type: 'image/jpeg' })
    mockMutateAsync.mockResolvedValue(new Blob(['cbz-data']))
    vi.mocked(parseCbzPages).mockResolvedValue([fakeBlob, fakeBlob])
    vi.mocked(loadCbzAsObjectUrls).mockReturnValue(['blob:mock/0', 'blob:mock/1'])

    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.pages).toHaveLength(2)
    expect(result.current.error).toBeNull()
    expect(mockSetTotalPages).toHaveBeenCalledWith(2)
  })

  it('returns error on download failure', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network error'))

    const { useReaderPages } = await import('#/hooks/useReaderPages')
    const { result } = renderHook(() => useReaderPages('http://example.com/test.cbz'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.pages).toEqual([])
    expect(result.current.error).toBe('Network error')
  })
})
