import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useManga, useUpdateManga } from '#/hooks/useManga'
import type { UpdateMangaPayload } from '#/services/api/mangaApi'
import { useState } from 'react'
import { Loader2, Plus, X, Save } from 'lucide-react'
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
  Field as UiField,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError as UiFieldError,
} from '#/components/ui/field'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

const mangaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string(),
  description: z.string(),
  alternativeTitles: z.array(z.string()),
  coverPath: z.string(),
  authors: z.array(z.string()).min(1, 'At least one author required'),
  genres: z.array(z.string()).min(1, 'At least one genre required'),
})

export const Route = createFileRoute('/admin/mangas/$id/edit')({
  component: EditMangaPage,
})

function EditMangaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: manga, isLoading, isError } = useManga(Number(id))
  const mutation = useUpdateManga()

  const [altInput, setAltInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [genreInput, setGenreInput] = useState('')

  const form = useForm({
    validators: {
      onSubmit: mangaSchema,
    },
    defaultValues: {
      title: manga?.title ?? '',
      status: manga?.status ?? 'ongoing',
      description: manga?.description ?? '',
      alternativeTitles: (manga?.alternativeTitles as string[]) ?? [],
      coverPath: manga?.coverPath ?? '',
      authors: manga?.authors?.map((a) => a.name) ?? [],
      genres: manga?.genres?.map((g) => g.name) ?? [],
    },
    onSubmit: async ({ value }) => {
      const payload: UpdateMangaPayload = {
        title: value.title,
        status: value.status,
        description: value.description || undefined,
        alternativeTitles:
          value.alternativeTitles.length > 0
            ? value.alternativeTitles
            : undefined,
        coverPath: value.coverPath || undefined,
        authors: value.authors,
        genres: value.genres,
      }
      mutation.mutate(
        { id: Number(id), data: payload },
        { onSuccess: () => navigate({ to: '/admin/mangas' }) },
      )
    },
  })

  function addTag(
    field: {
      state: { value: string[] }
      handleChange: (v: string[]) => void
    },
    input: string,
    setInput: (v: string) => void,
  ) {
    const trimmed = input.trim()
    if (trimmed && !field.state.value.includes(trimmed)) {
      field.handleChange([...field.state.value, trimmed])
    }
    setInput('')
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Edit Manga</h1>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !manga) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-6 text-red-700">
          Failed to load manga. It may not exist or the backend is unavailable.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Edit Manga</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="mt-6"
      >
        <FieldGroup>
          <form.Field name="title">
            {(field) => (
              <UiField data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="title" required>
                  Title
                </FieldLabel>
                <Input
                  id="title"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="One Piece"
                  aria-invalid={field.state.meta.errors.length > 0 || undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <UiFieldError errors={field.state.meta.errors} />
                )}
              </UiField>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
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
              </UiField>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="A story about..."
                  rows={3}
                />
              </UiField>
            )}
          </form.Field>

          <form.Field name="alternativeTitles">
            {(field) => {
              const titles = field.state.value
              return (
                <UiField>
                  <FieldLabel>Alternative Titles</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={altInput}
                      onChange={(e) => setAltInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, altInput, setAltInput))
                      }
                      placeholder="Type and press Enter"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, altInput, setAltInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {titles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {titles.map((t, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {t}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                titles.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          <form.Field name="coverPath">
            {(field) => (
              <UiField>
                <FieldLabel htmlFor="coverPath">Cover Path</FieldLabel>
                <Input
                  id="coverPath"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="/covers/one_piece.jpg"
                />
              </UiField>
            )}
          </form.Field>

          <form.Field name="authors">
            {(field) => {
              const authors = field.state.value
              return (
                <UiField data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>Authors</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={authorInput}
                      onChange={(e) => setAuthorInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, authorInput, setAuthorInput))
                      }
                      placeholder="Eiichiro Oda"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, authorInput, setAuthorInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                  {authors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {authors.map((a, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {a}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                authors.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          <form.Field name="genres">
            {(field) => {
              const genres = field.state.value
              return (
                <UiField data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>Genres</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.preventDefault(),
                        addTag(field, genreInput, setGenreInput))
                      }
                      placeholder="Action"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(field, genreInput, setGenreInput)}
                    >
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                  {genres.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {genres.map((g, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {g}
                          <button
                            type="button"
                            onClick={() =>
                              field.handleChange(
                                genres.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </UiField>
              )
            }}
          </form.Field>

          {mutation.isError && (
            <UiField data-invalid>
              <FieldDescription className="text-destructive">
                {(mutation.error as Error).message || 'Failed to update manga'}
              </FieldDescription>
            </UiField>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/admin/mangas' })}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            />
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
