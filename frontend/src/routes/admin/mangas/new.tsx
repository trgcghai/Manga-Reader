import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createManga  } from '#/lib/api/mangas'
import type {CreateMangaPayload} from '#/lib/api/mangas';
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '#/components/ui/field'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/admin/mangas/new')({
  component: CreateMangaPage,
})

function CreateMangaPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('ongoing')
  const [description, setDescription] = useState('')
  const [alternativeTitles, setAlternativeTitles] = useState<string[]>([])
  const [altInput, setAltInput] = useState('')
  const [coverPath, setCoverPath] = useState('')
  const [authors, setAuthors] = useState<string[]>([])
  const [authorInput, setAuthorInput] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [genreInput, setGenreInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: (data: CreateMangaPayload) => createManga(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas'] })
      navigate({ to: '/admin/mangas' })
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (authors.length === 0) errs.authors = 'At least one author required'
    if (genres.length === 0) errs.genres = 'At least one genre required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      title: title.trim(),
      status,
      description: description.trim() || undefined,
      alternativeTitles: alternativeTitles.length > 0 ? alternativeTitles : undefined,
      coverPath: coverPath.trim() || undefined,
      authors,
      genres,
    })
  }

  function addItem(
    list: string[],
    setter: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void,
  ) {
    const trimmed = input.trim()
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed])
    }
    setInput('')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="display-title text-2xl font-bold text-(--sea-ink)">
        Add Manga
      </h1>

      <form onSubmit={handleSubmit} className="mt-6">
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="title">Title *</FieldLabel>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One Piece"
              aria-invalid={!!errors.title || undefined}
            />
            {errors.title && <FieldError errors={[{ message: errors.title }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A story about..."
              rows={3}
            />
          </Field>

          <Field>
            <FieldLabel>Alternative Titles</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(),
                  addItem(alternativeTitles, setAlternativeTitles, altInput, setAltInput))
                }
                placeholder="Type and press Enter"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  addItem(alternativeTitles, setAlternativeTitles, altInput, setAltInput)
                }
              >
                Add
              </Button>
            </div>
            {alternativeTitles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {alternativeTitles.map((t, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {t}
                    <button
                      type="button"
                      onClick={() =>
                        setAlternativeTitles(alternativeTitles.filter((_, j) => j !== i))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="coverPath">Cover Path</FieldLabel>
            <Input
              id="coverPath"
              value={coverPath}
              onChange={(e) => setCoverPath(e.target.value)}
              placeholder="/covers/one_piece.jpg"
            />
          </Field>

          <Field data-invalid={errors.authors ? true : undefined}>
            <FieldLabel>Authors *</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(),
                  addItem(authors, setAuthors, authorInput, setAuthorInput))
                }
                placeholder="Eiichiro Oda"
                aria-invalid={!!errors.authors || undefined}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  addItem(authors, setAuthors, authorInput, setAuthorInput)
                }
              >
                Add
              </Button>
            </div>
            {errors.authors && <FieldError errors={[{ message: errors.authors }]} />}
            {authors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {authors.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {a}
                    <button
                      type="button"
                      onClick={() => setAuthors(authors.filter((_, j) => j !== i))}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>

          <Field data-invalid={errors.genres ? true : undefined}>
            <FieldLabel>Genres *</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(),
                  addItem(genres, setGenres, genreInput, setGenreInput))
                }
                placeholder="Action"
                aria-invalid={!!errors.genres || undefined}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  addItem(genres, setGenres, genreInput, setGenreInput)
                }
              >
                Add
              </Button>
            </div>
            {errors.genres && <FieldError errors={[{ message: errors.genres }]} />}
            {genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {genres.map((g, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {g}
                    <button
                      type="button"
                      onClick={() => setGenres(genres.filter((_, j) => j !== i))}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>

          {mutation.isError && (
            <Field data-invalid>
              <FieldDescription className="text-destructive">
                {mutation.error.message || 'Failed to create manga'}
              </FieldDescription>
            </Field>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Create Manga'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/admin/mangas' })}
            >
              Cancel
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
