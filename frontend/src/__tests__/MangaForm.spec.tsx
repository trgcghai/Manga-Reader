import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MangaForm } from '#/components/manga/MangaForm'

const defaultValues = {
  title: '',
  status: 'ongoing',
  description: '',
  alternativeTitles: [],
  coverPath: '',
  coverFile: null,
  authors: [],
  genres: [],
}

describe('MangaForm cover field', () => {
  it('renders drag-and-drop zone instead of text input', () => {
    render(
      <MangaForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Create"
        submitIcon={<span>+</span>}
        cancelLabel="Cancel"
        heading="Test"
      />,
    )
    expect(screen.getByText('Drag & drop or click to upload')).toBeInTheDocument()
    expect(screen.getByText('Browse')).toBeInTheDocument()
  })

  it('renders hidden file input with image accept types', () => {
    render(
      <MangaForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Create"
        submitIcon={<span>+</span>}
        cancelLabel="Cancel"
        heading="Test"
      />,
    )
    const hiddenInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(hiddenInput).toBeInTheDocument()
    expect(hiddenInput!.accept).toBe('image/jpeg,image/png,image/webp,image/gif')
  })

  it('shows preview when coverPath exists (edit mode)', () => {
    render(
      <MangaForm
        defaultValues={{ ...defaultValues, coverPath: 'http://example.com/cover.jpg' }}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Save"
        submitIcon={<span>✓</span>}
        cancelLabel="Cancel"
        heading="Edit"
      />,
    )
    const img = screen.getByAltText('Cover preview')
    expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg')
  })

  it('removes cover preview when Remove is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MangaForm
        defaultValues={{ ...defaultValues, coverPath: 'http://example.com/cover.jpg' }}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Save"
        submitIcon={<span>✓</span>}
        cancelLabel="Cancel"
        heading="Edit"
      />,
    )

    expect(screen.getByAltText('Cover preview')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove/i }))

    expect(screen.queryByAltText('Cover preview')).not.toBeInTheDocument()
    expect(screen.getByText('Drag & drop or click to upload')).toBeInTheDocument()
  })
})
