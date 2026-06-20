import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { FileDropzone } from '#/components/ui/file-dropzone'

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

const mockFile = new File([''], 'chapter-1.cbz', { type: 'application/zip' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FileDropzone', () => {
  describe('empty state', () => {
    it('renders default message when no file is selected', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument()
    })

    it('renders custom message when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          message="Custom message"
        />,
      )
      expect(screen.getByText('Custom message')).toBeInTheDocument()
    })

    it('renders hint text when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          hint="CBZ, ZIP"
        />,
      )
      expect(screen.getByText('CBZ, ZIP')).toBeInTheDocument()
    })

    it('renders Browse Files button', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
    })

    it('renders custom icon when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          value={null}
          onFileSelect={vi.fn()}
          icon={<span data-testid="custom-icon">📄</span>}
        />,
      )
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('applies custom className to root', () => {
      const { container } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} className="my-custom-class" />,
      )
      expect(container.firstChild).toHaveClass('my-custom-class')
    })
  })

  describe('selected state — badge', () => {
    it('renders filename in a Badge when value is set and selectedDisplay is badge (default)', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={mockFile} onFileSelect={vi.fn()} />)
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
    })
  })

  describe('selected state — icon', () => {
    it('renders custom icon and filename when selectedDisplay is icon', () => {
      render(
        <FileDropzone
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          value={mockFile}
          onFileSelect={vi.fn()}
          selectedDisplay="icon"
          icon={<span data-testid="file-icon">📄</span>}
        />,
      )
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
    })
  })

  describe('null value', () => {
    it('shows empty state when value is null', () => {
      const { rerender } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={mockFile} onFileSelect={vi.fn()} />,
      )
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
      rerender(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument()
    })
  })

  describe('preview mode', () => {
    it('renders image when previewUrl is provided', () => {
      render(
        <FileDropzone
          accept={{ 'image/jpeg': ['.jpg'] }}
          value={null}
          onFileSelect={vi.fn()}
          previewUrl="http://example.com/cover.jpg"
        />,
      )
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg')
    })

    it('renders remove button when onRemove is provided', () => {
      render(
        <FileDropzone
          accept={{ 'image/jpeg': ['.jpg'] }}
          value={null}
          onFileSelect={vi.fn()}
          previewUrl="http://example.com/cover.jpg"
          onRemove={vi.fn()}
        />,
      )
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('calls onRemove and onFileSelect(null) when remove button is clicked', async () => {
      const onRemove = vi.fn()
      const onFileSelect = vi.fn()
      render(
        <FileDropzone
          accept={{ 'image/jpeg': ['.jpg'] }}
          value={null}
          onFileSelect={onFileSelect}
          previewUrl="http://example.com/cover.jpg"
          onRemove={onRemove}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /remove/i }))
      expect(onRemove).toHaveBeenCalledOnce()
      expect(onFileSelect).toHaveBeenCalledWith(null)
    })

    it('applies aspectRatio class to preview container', () => {
      const { container } = render(
        <FileDropzone
          accept={{ 'image/jpeg': ['.jpg'] }}
          value={null}
          onFileSelect={vi.fn()}
          previewUrl="http://example.com/cover.jpg"
          aspectRatio="aspect-3/4"
        />,
      )
      const previewDiv = container.firstChild?.firstChild as HTMLElement
      expect(previewDiv).toHaveClass('aspect-3/4')
    })
  })

  describe('error state', () => {
    it('renders error message when error prop is set', () => {
      render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          error="File is required"
        />,
      )
      expect(screen.getByText('File is required')).toBeInTheDocument()
    })

    it('does not render error when error prop is not set', () => {
      const { container } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />,
      )
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('renders disabled class when disabled is true', () => {
      const { container } = render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          disabled
        />,
      )
      const innerDiv = container.firstChild?.firstChild as HTMLElement
      expect(innerDiv).toHaveClass('pointer-events-none')
      expect(innerDiv).toHaveClass('opacity-50')
    })
  })

  describe('interactions', () => {
    it('calls onFileSelect when a file is dropped', async () => {
      const onFileSelect = vi.fn()
      const file = new File([''], 'test.cbz', { type: 'application/zip' })
      const { container } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={onFileSelect} />,
      )
      const dropzone = container.firstChild?.firstChild as HTMLElement
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file], types: ['Files'] },
      })
      act(() => {
        dropzone.dispatchEvent(dropEvent)
      })
      await waitFor(() => {
        expect(onFileSelect).toHaveBeenCalledWith(file)
      })
    })

    it('shows toast.error when a rejected file is dropped', async () => {
      const onFileSelect = vi.fn()
      const invalidFile = new File([''], 'image.png', { type: 'image/png' })
      const { container } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={onFileSelect} />,
      )
      const dropzone = container.firstChild?.firstChild as HTMLElement
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [invalidFile], types: ['Files'] },
      })
      act(() => {
        dropzone.dispatchEvent(dropEvent)
      })
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })
})
