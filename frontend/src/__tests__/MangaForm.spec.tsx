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
  it('renders file input instead of text input', () => {
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
    const fileInput = screen.getByLabelText('Cover Image')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
  })

  it('accepts image file types', () => {
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
    const fileInput = screen.getByLabelText('Cover Image') as HTMLInputElement
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp,image/gif')
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

  it('calls onSubmit with coverRemoved=true when Remove is clicked', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <MangaForm
        defaultValues={{ ...defaultValues, title: 'Test Manga', coverPath: 'http://example.com/cover.jpg', authors: ['Author'], genres: ['Genre'] }}
        onSubmit={onSubmit}
        isPending={false}
        submitLabel="Save"
        submitIcon={<span>✓</span>}
        cancelLabel="Cancel"
        heading="Edit"
      />,
    )

    await user.click(screen.getByText('Remove Cover'))
    await user.click(screen.getByText('Save'))

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), true)
  })
})
