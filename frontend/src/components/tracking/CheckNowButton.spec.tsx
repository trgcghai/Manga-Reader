import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckNowButton } from './CheckNowButton'
import { useCheckMangaSources } from '#/hooks/useTracking'
import { toast } from 'sonner'
import type { Mock } from 'vitest'

vi.mock('#/hooks/useTracking', () => ({
  useCheckMangaSources: vi.fn(),
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

describe('CheckNowButton', () => {
  let mutateMock: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mutateMock = vi.fn()
    ;(useCheckMangaSources as Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    })
  })

  it('calls the check mutation with the row mangaId on click', async () => {
    const user = userEvent.setup()
    render(<CheckNowButton mangaId={42} />)

    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(mutateMock).toHaveBeenCalledWith(42, expect.any(Object))
  })

  it('shows a spinner and disables the button while pending', () => {
    ;(useCheckMangaSources as Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: true,
    })

    const { container } = render(<CheckNowButton mangaId={1} />)

    const button = screen.getByRole('button', { name: 'Check now' })
    expect(button).toBeDisabled()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows a summary toast with the updated count on success', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_mangaId: number, options: unknown) => {
      ;(options as { onSuccess: (results: unknown[]) => void }).onSuccess([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: true },
        { sourceId: 3, sourceName: 'C', url: 'u', updated: false },
      ])
    })

    render(<CheckNowButton mangaId={1} />)
    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(toast.success).toHaveBeenCalledWith('2 of 3 sources updated')
  })

  it('shows a 0 of N summary when no sources were updated', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_mangaId: number, options: unknown) => {
      ;(options as { onSuccess: (results: unknown[]) => void }).onSuccess([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: false },
      ])
    })

    render(<CheckNowButton mangaId={1} />)
    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(toast.success).toHaveBeenCalledWith('0 of 2 sources updated')
  })
})
