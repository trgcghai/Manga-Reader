import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import type { PaginatedTrackingSourceResponse } from '#/services/api/trackingApi'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
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
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
}

interface RenderTableProps {
  data?: PaginatedTrackingSourceResponse
  isLoading?: boolean
  isError?: boolean
  page?: number
  pageSize?: number
  search?: string
  onSearchChange?: (value: string) => void
}

function renderTable(overrides: RenderTableProps = {}) {
  return render(
    <TrackingSourcesTable
      data={overrides.data}
      isLoading={overrides.isLoading ?? false}
      isError={overrides.isError ?? false}
      page={overrides.page ?? 1}
      pageSize={overrides.pageSize ?? 20}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onRetry={vi.fn()}
      onManage={vi.fn()}
      search={overrides.search ?? ''}
      onSearchChange={overrides.onSearchChange ?? vi.fn()}
    />,
  )
}

describe('TrackingSourcesTable', () => {
  it('renders a search input with an accessible label', () => {
    renderTable()

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('renders the current search value in the input', () => {
    renderTable({ search: 'naruto' })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toHaveValue('naruto')
  })

  it('calls onSearchChange when typing', async () => {
    const onSearchChange = vi.fn()
    const user = userEvent.setup()
    renderTable({ onSearchChange })

    await user.type(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
      'naru',
    )

    expect(onSearchChange).toHaveBeenLastCalledWith('naru')
    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toHaveValue('naru')
  })

  it('shows the clear button when search is non-empty and clears on click', async () => {
    const onSearchChange = vi.fn()
    const user = userEvent.setup()
    renderTable({ search: 'naruto', onSearchChange })

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('does not show the clear button when search is empty', () => {
    renderTable()

    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()
  })

  it('renders the search box in the loading state', () => {
    renderTable({ isLoading: true })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('renders the search box in the error state', () => {
    renderTable({ isError: true })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('renders the search box above a populated table', () => {
    renderTable({ data: mockPage })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
    expect(screen.getByText('MangaDex')).toBeInTheDocument()
  })

  it('shows search-specific empty copy when a search matches nothing', () => {
    renderTable({
      data: { ...mockPage, data: [], total: 0, totalPages: 0 },
      search: 'zzz',
    })

    expect(screen.getByText('No Sources Match Your Search')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No sources match "zzz". Try a different search term or clear the search.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the generic empty copy when no search and no sources', () => {
    renderTable({ data: { ...mockPage, data: [], total: 0, totalPages: 0 } })

    expect(screen.getByText('No Tracking Sources')).toBeInTheDocument()
  })
})
