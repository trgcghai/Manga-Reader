import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTrackingSources,
  useTrackingConfig,
  useCreateTrackingSource,
  useUpdateTrackingSource,
  useDeleteTrackingSource,
  useUpdateTrackingConfig,
  useCheckTrackingSource,
  useCheckMangaSources,
  useCheckAllSources,
} from './useTracking'
import { toast } from 'sonner'

vi.mock('#/services/api/trackingApi', () => ({
  getTrackingSources: vi.fn(),
  createTrackingSource: vi.fn(),
  updateTrackingSource: vi.fn(),
  deleteTrackingSource: vi.fn(),
  getTrackingConfig: vi.fn(),
  updateTrackingConfig: vi.fn(),
  checkTrackingSource: vi.fn(),
  checkMangaSources: vi.fn(),
  checkAllSources: vi.fn(),
}))

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  })
  return { default: toastFn, toast: toastFn }
})

// eslint-disable-next-line import/first
import {
  getTrackingSources,
  createTrackingSource,
  updateTrackingSource,
  deleteTrackingSource,
  getTrackingConfig,
  updateTrackingConfig,
  checkTrackingSource,
  checkMangaSources,
  checkAllSources,
} from '#/services/api/trackingApi'
// eslint-disable-next-line import/first
import type { Mock } from 'vitest'
// eslint-disable-next-line import/first
import type {
  PaginatedTrackingSourceResponse,
  TrackingConfigResponse,
} from '#/services/api/trackingApi'

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

describe('useTracking', () => {
  const paginatedMock: PaginatedTrackingSourceResponse = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }

  const configMock: TrackingConfigResponse = {
    id: 1,
    frequency: 'daily',
    interval: 1,
    runAt: '00:00',
    updatedAt: new Date().toISOString(),
  }

  let invalidateSpy: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    ;(getTrackingSources as Mock).mockResolvedValue(paginatedMock)
    ;(getTrackingConfig as Mock).mockResolvedValue(configMock)
  })

  describe('useTrackingSources', () => {
    it('fetches sources with the provided params', async () => {
      const { result } = renderHook(
        () => useTrackingSources({ mangaId: 1, page: 2, limit: 20 }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => expect(result.current.data).toEqual(paginatedMock))
      expect(getTrackingSources).toHaveBeenCalledWith({
        mangaId: 1,
        page: 2,
        limit: 20,
      })
    })

    it('passes an empty object when called without args', async () => {
      renderHook(() => useTrackingSources(), { wrapper: createWrapper() })

      await waitFor(() => expect(getTrackingSources).toHaveBeenCalledWith({}))
    })

    it('forwards the search term', async () => {
      renderHook(() => useTrackingSources({ search: 'naruto' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() =>
        expect(getTrackingSources).toHaveBeenCalledWith({ search: 'naruto' }),
      )
    })
  })

  describe('useTrackingConfig', () => {
    it('fetches the tracking config', async () => {
      const { result } = renderHook(() => useTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.data).toEqual(configMock))
      expect(getTrackingConfig).toHaveBeenCalled()
    })
  })

  describe('useCreateTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(createTrackingSource as Mock).mockResolvedValue({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'MangaDex',
        latestChapterNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useCreateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          mangaId: 1,
          url: 'https://example.com/manga/one-piece',
          name: 'MangaDex',
        })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source "MangaDex" created')
    })

    it('shows error toast on failure', async () => {
      ;(createTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCreateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current
          .mutateAsync({
            mangaId: 1,
            url: 'https://example.com/manga/one-piece',
            name: 'MangaDex',
          })
          .catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useUpdateTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(updateTrackingSource as Mock).mockResolvedValue({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'Renamed',
        latestChapterNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useUpdateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { name: 'Renamed' },
        })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source "Renamed" updated')
    })

    it('shows error toast on failure', async () => {
      ;(updateTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useUpdateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current
          .mutateAsync({
            id: 1,
            data: { name: 'Renamed' },
          })
          .catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useDeleteTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(deleteTrackingSource as Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source deleted')
    })

    it('shows error toast on failure', async () => {
      ;(deleteTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useDeleteTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useUpdateTrackingConfig', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(updateTrackingConfig as Mock).mockResolvedValue(configMock)

      const { result } = renderHook(() => useUpdateTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ runAt: '02:00' })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Tracking config updated')
    })

    it('shows error toast on failure', async () => {
      ;(updateTrackingConfig as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useUpdateTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ runAt: '02:00' }).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useCheckTrackingSource', () => {
    it('passes the id and invalidates source lists when updated', async () => {
      ;(checkTrackingSource as Mock).mockResolvedValue({
        updated: true,
        previous: '100',
        current: '101',
        mangaId: 1,
      })

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7)
      })

      expect(checkTrackingSource).toHaveBeenCalledWith(7)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when nothing updated', async () => {
      ;(checkTrackingSource as Mock).mockResolvedValue({
        updated: false,
        current: '101',
      })

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7)
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
      expect(invalidateSpy).not.toHaveBeenCalled()
    })
  })

  describe('useCheckMangaSources', () => {
    it('passes the mangaId and invalidates source lists when some sources updated', async () => {
      ;(checkMangaSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3)
      })

      expect(checkMangaSources).toHaveBeenCalledWith(3)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when zero sources updated', async () => {
      ;(checkMangaSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3)
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkMangaSources as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useCheckAllSources', () => {
    it('invalidates source lists when some sources updated', async () => {
      ;(checkAllSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
      ])

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(checkAllSources).toHaveBeenCalledWith()
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when zero sources updated', async () => {
      ;(checkAllSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkAllSources as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync().catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })
})
