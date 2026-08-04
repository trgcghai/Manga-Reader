import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TrackingPage } from './TrackingPage'
import type { PaginatedTrackingSourceResponse } from '#/services/api/trackingApi'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const {
  mockUseTrackingSources,
  mockUseTrackingConfig,
  mockUpdateTrackingConfig,
} = vi.hoisted(() => ({
  mockUseTrackingSources: vi.fn(),
  mockUseTrackingConfig: vi.fn(),
  mockUpdateTrackingConfig: vi.fn(),
}))

vi.mock('#/hooks/useTracking', () => ({
  useTrackingSources: mockUseTrackingSources,
  useTrackingConfig: mockUseTrackingConfig,
  useUpdateTrackingConfig: mockUpdateTrackingConfig,
  useCreateTrackingSource: vi.fn(),
  useDeleteTrackingSource: vi.fn(),
  useUpdateTrackingSource: vi.fn(),
}))

const mockPage: PaginatedTrackingSourceResponse = {
  data: [
    {
      id: 1,
      mangaId: 1,
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      manga: { id: 1, title: 'One Piece' },
    },
  ],
  total: 50,
  page: 1,
  limit: 20,
  totalPages: 3,
}

const paginatedStub = {
  data: mockPage,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}

const defaultStub = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}

async function settleDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
}

describe('TrackingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUseTrackingSources.mockReset().mockReturnValue(defaultStub)
    mockUseTrackingConfig
      .mockReset()
      .mockReturnValue({ data: undefined, isLoading: false })
    mockUpdateTrackingConfig
      .mockReset()
      .mockReturnValue({ isPending: false, mutate: vi.fn() })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queries the first page with no search term on mount', async () => {
    render(<TrackingPage />)
    await settleDebounce()

    expect(mockUseTrackingSources).toHaveBeenCalledTimes(1)
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
    })
  })

  it('debounces typing, trims the search term, and resets the page', async () => {
    mockUseTrackingSources.mockReturnValue(paginatedStub)
    render(<TrackingPage />)
    await settleDebounce()

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 3,
      limit: 20,
      search: undefined,
    })

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
      { target: { value: '  manga  ' } },
    )
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 3,
      limit: 20,
      search: undefined,
    })

    await settleDebounce()
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: 'manga',
    })
  })

  it('clears the search and queries without a search term', async () => {
    render(<TrackingPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
      { target: { value: 'manga' } },
    )
    await settleDebounce()
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: 'manga',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await settleDebounce()
    expect(mockUseTrackingSources).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
    })
  })
})
