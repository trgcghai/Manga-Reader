import { describe, it, expect, vi, beforeEach } from 'vitest'

// Polyfill ResizeObserver and scrollIntoView for jsdom (required by cmdk)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

Element.prototype.scrollIntoView = vi.fn()
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TranslatorCombobox } from './TranslatorCombobox'

vi.mock('#/services/api/translatorApi', () => ({
  getTranslators: vi.fn(),
}))

import { getTranslators } from '#/services/api/translatorApi'
import type { Mock } from 'vitest'

const mockTranslators = [
  { id: 1, name: 'Oda', note: null, createdAt: '', updatedAt: '' },
  { id: 2, name: 'Miura', note: null, createdAt: '', updatedAt: '' },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('TranslatorCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger with placeholder when no translator selected', () => {
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('Select translator...')).toBeInTheDocument()
  })

  it('opens popover on trigger click', async () => {
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByPlaceholderText('Search translator...')).toBeInTheDocument()
  })

  it('displays translators in the list', async () => {
    (getTranslators as Mock).mockResolvedValue({
      data: mockTranslators,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('Oda')).toBeInTheDocument()
      expect(screen.getByText('Miura')).toBeInTheDocument()
    })
  })

  it('calls onChange when a translator is selected', async () => {
    (getTranslators as Mock).mockResolvedValue({
      data: mockTranslators,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={onChange} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Oda'))
    await user.click(screen.getByText('Oda'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('shows empty state when no results', async () => {
    (getTranslators as Mock).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('No translators found.')).toBeInTheDocument()
    })
  })

  it('shows error and retry on API failure', async () => {
    (getTranslators as Mock).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('Failed to load translators.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('retry button re-fetches', async () => {
    const mockGetTranslators = getTranslators as Mock
    mockGetTranslators
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: mockTranslators,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Retry'))
    await user.click(screen.getByText('Retry'))
    await waitFor(() => {
      expect(screen.getByText('Oda')).toBeInTheDocument()
    })
  })

  it('shows loading spinner while fetching', async () => {
    (getTranslators as Mock).mockImplementation(
      () => new Promise(() => {}),
    )
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
