import { describe, it, expect, vi, beforeEach } from 'vitest'

// ResizeObserver + scrollIntoView polyfills must be set before Radix imports
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Element.prototype.scrollIntoView = vi.fn()

/* eslint-disable import/first */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BatchImportDialog } from './BatchImportDialog'
/* eslint-enable import/first */

vi.mock('#/hooks/useBatchImport', () => ({
  useBatchImport: vi.fn(() => ({
    mutate: vi.fn(),
    progress: { total: 0, completed: 0, failed: 0 },
    isRunning: false,
  })),
}))

vi.mock('#/hooks/useLanguages', () => ({
  useLanguageList: vi.fn(() => ({
    data: [
      { id: 1, code: 'en', name: 'English' },
      { id: 2, code: 'vi', name: 'Vietnamese' },
    ],
    isLoading: false,
  })),
}))

URL.createObjectURL = vi.fn(() => 'blob:mock')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('BatchImportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    mangaId: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with title when open', () => {
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Batch Import Chapters')).toBeInTheDocument()
  })

  it('shows folder picker area in initial state', () => {
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })
    expect(
      screen.getByText('Select a folder containing .zip chapter files'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
  })

  it('has submit button disabled in initial state', () => {
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })
    const submitBtn = screen.getByRole('button', { name: /import/i })
    expect(submitBtn).toBeDisabled()
  })

  it('shows language and translator selectors', () => {
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Translator')).toBeInTheDocument()
  })

  it('shows file list after folder selection', async () => {
    const user = userEvent.setup()
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'ch01.zip', { type: 'application/zip' })
    const file2 = new File([''], 'ch02.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')

    await user.upload(input, [file, file2])

    expect(screen.getByText('2 .zip files selected')).toBeInTheDocument()
    expect(screen.getByText('ch01.zip')).toBeInTheDocument()
    expect(screen.getByText('ch02.zip')).toBeInTheDocument()
  })

  it('shows error when no .zip files found', async () => {
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const input = screen.getByTestId('folder-input') as HTMLInputElement
    const file = new File([''], 'readme.txt', { type: 'text/plain' })

    // fireEvent.change bypasses accept attribute filtering
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(
        screen.getByText('No .zip files found in folder'),
      ).toBeInTheDocument()
    })
  })

  it('disables submit after folder selection without language and translator', async () => {
    const user = userEvent.setup()
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'ch01.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')
    await user.upload(input, [file])

    const submitBtn = screen.getByRole('button', { name: /import/i })
    expect(submitBtn).toBeDisabled()
  })

  it('shows file count in submit button text after folder selection', async () => {
    const user = userEvent.setup()
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'ch01.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')
    await user.upload(input, [file])

    expect(screen.getByText(/import 1 files?/i)).toBeInTheDocument()
  })

  it('resets state when dialog closes', async () => {
    const { rerender } = render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const user = userEvent.setup()
    const file = new File([''], 'ch01.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')
    await user.upload(input, [file])
    expect(screen.getByText('1 .zip files selected')).toBeInTheDocument()

    rerender(
      <BatchImportDialog open={false} onOpenChange={vi.fn()} mangaId={1} />,
    )
    rerender(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByText('Select a folder containing .zip chapter files'),
    ).toBeInTheDocument()
  })

  it('shows parsed chapter numbers in file list', async () => {
    const user = userEvent.setup()
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'chapter 5.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')
    await user.upload(input, [file])

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows warning indicator for unparseable filenames', async () => {
    const user = userEvent.setup()
    render(<BatchImportDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    })

    const badFile = new File([''], 'random.zip', { type: 'application/zip' })
    const input = screen.getByTestId('folder-input')
    await user.upload(input, [badFile])

    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
