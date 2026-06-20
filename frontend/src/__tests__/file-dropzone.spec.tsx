import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileDropzone } from '#/components/ui/file-dropzone'

const mockFile = new File([''], 'chapter-1.cbz', { type: 'application/zip' })

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
})
