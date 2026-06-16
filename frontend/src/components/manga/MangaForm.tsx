import { useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
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
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { addTag } from '#/lib/mangaUtils'

export const mangaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string(),
  description: z.string(),
  alternativeTitles: z.array(z.string()),
  coverPath: z.string(),
  authors: z.array(z.string()).min(1, 'At least one author required'),
  genres: z.array(z.string()).min(1, 'At least one genre required'),
})

type FormValues = z.infer<typeof mangaSchema>

interface MangaFormProps {
  defaultValues: FormValues
  onSubmit: (values: FormValues) => void
  isPending: boolean
  error?: string | null
  submitLabel: string
  submitIcon: ReactNode
  cancelLabel: string
  /** Callback when cancel is clicked. If `resetOnCancel` is true, the form resets instead. */
  cancelAction?: () => void
  /** When true, cancel button resets the form internally */
  resetOnCancel?: boolean
  heading: string
}

export function MangaForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  submitIcon,
  cancelLabel,
  heading,
  resetOnCancel,
  cancelAction,
}: MangaFormProps) {
  const [altInput, setAltInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [genreInput, setGenreInput] = useState('')

  const form = useForm({
    validators: { onSubmit: mangaSchema },
    defaultValues,
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">{heading}</h1>

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

          {error && (
            <UiField data-invalid>
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            </UiField>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetOnCancel ? () => form.reset() : cancelAction}
            >
              <X className="size-4" />
              {cancelLabel}
            </Button>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting || isPending}>
                  {isSubmitting || isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {submitIcon}
                      {submitLabel}
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
