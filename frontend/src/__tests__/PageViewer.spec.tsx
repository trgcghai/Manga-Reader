import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageViewer } from '#/components/reader/PageViewer'

const mockPages = ['blob:1', 'blob:2', 'blob:3']

function renderPageViewer(
  overrides: Partial<{
    pages: string[]
    displayMode: 'single' | 'double'
    currentPage: number
    onNextPage: () => void
    onPrevPage: () => void
  }> = {},
) {
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
  it('renders the current page image with correct alt text', () => {
    renderPageViewer({ currentPage: 1 })
    const img = screen.getByAltText('Page 2')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'blob:2')
  })

  it('clamps out-of-bounds currentPage to last page', () => {
    renderPageViewer({ currentPage: 100 })
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'blob:3')
    expect(img).toHaveAttribute('alt', 'Page 3')
  })

  it('renders nothing when pages is empty', () => {
    const { container } = render(
      <PageViewer
        pages={[]}
        displayMode="single"
        currentPage={0}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows page indicator at bottom center', () => {
    renderPageViewer({ currentPage: 1 })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('calls onPrevPage when left third is clicked', () => {
    const { props, container } = renderPageViewer()
    const viewer = container.firstChild as HTMLElement
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({
      width: 900,
      left: 0,
      top: 0,
      height: 600,
      right: 900,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    fireEvent.click(viewer, { clientX: 100 })
    expect(props.onPrevPage).toHaveBeenCalledTimes(1)
  })

  it('calls onNextPage when right third is clicked', () => {
    const { props, container } = renderPageViewer()
    const viewer = container.firstChild as HTMLElement
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({
      width: 900,
      left: 0,
      top: 0,
      height: 600,
      right: 900,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    fireEvent.click(viewer, { clientX: 800 })
    expect(props.onNextPage).toHaveBeenCalledTimes(1)
  })

  it('does nothing when middle third is clicked', () => {
    const { props, container } = renderPageViewer()
    const viewer = container.firstChild as HTMLElement
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({
      width: 900,
      left: 0,
      top: 0,
      height: 600,
      right: 900,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    fireEvent.click(viewer, { clientX: 450 })
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
    renderPageViewer({
      displayMode: 'double',
      currentPage: 2,
      pages: ['b:1', 'b:2', 'b:3'],
    })
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('alt', 'Page 3')
  })
})
