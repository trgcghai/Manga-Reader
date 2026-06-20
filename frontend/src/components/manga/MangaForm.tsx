import { useState, useEffect } from 'react'
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
import { FileDropzone } from '#/components/ui/file-dropzone'

export const mangaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string(),
  description: z.string(),
  alternativeTitles: z.array(z.string()),
  coverPath: z.string(),
  coverFile: z.instanceof(File).nullable().optional(),
  authors: z.array(z.string()).min(1, 'At least one author required'),
  genres: z.array(z.string()).min(1, 'At least one genre required'),
})

type FormValues = z.infer<typeof mangaSchema>

interface MangaFormProps {
  defaultValues: FormValues
  onSubmit: (values: FormValues, coverRemoved: boolean) => void
  isPending: boolean
  error?: string | null
  submitLabel: string
  submitIcon: ReactNode
  cancelLabel: string
  cancelAction?: () => void
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
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)

  const form = useForm({
    validators: { onSubmit: mangaSchema },
    defaultValues,
    onSubmit: async ({ value }) => onSubmit(value, coverRemoved),
  })

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const handleRemoveCover = () => {
    form.setFieldValue('coverFile', null)
    setCoverPreview(null)
    setCoverRemoved(true)
  }

  const hasExistingCover = !!form.getFieldValue('coverPath')
  const showCoverPreview = !coverRemoved && (!!coverPreview || hasExistingCover)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="mt-8"
      >
        <FieldGroup>
          <div className="grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <form.Field name="coverFile">
                {(_) => (
                  <UiField>
                    <FieldLabel>Cover Image</FieldLabel>
                    <FileDropzone
                      accept={{
                        'image/jpeg': ['.jpg', '.jpeg'],
                        'image/png': ['.png'],
                        'image/webp': ['.webp'],
                        'image/gif': ['.gif'],
                      }}
                      value={form.getFieldValue('coverFile') as File | null}
                      onFileSelect={(file) => {
                        form.setFieldValue('coverFile', file)
                        if (file) {
                          setCoverPreview(URL.createObjectURL(file))
                          setCoverRemoved(false)
                        }
                      }}
                      message="Drag & drop or click to upload"
                      hint="JPG, PNG, WebP, GIF"
                      previewUrl={
                        showCoverPreview
                          ? coverPreview || form.getFieldValue('coverPath')
                          : undefined
                      }
                      onRemove={showCoverPreview ? handleRemoveCover : undefined}
                      aspectRatio="aspect-3/4"
                    />
                  </UiField>
                )}
              </form.Field>
            </div>

            <div className="min-w-0 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
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
                        aria-invalid={
                          field.state.meta.errors.length > 0 || undefined
                        }
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
              </div>

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

              <div className="border-t" />

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
                            <Badge
                              key={i}
                              variant="secondary"
                              className="gap-1"
                            >
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

              <div className="border-t" />

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="authors">
                  {(field) => {
                    const authors = field.state.value
                    return (
                      <UiField
                        data-invalid={field.state.meta.errors.length > 0}
                      >
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
                            onClick={() =>
                              addTag(field, authorInput, setAuthorInput)
                            }
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
                              <Badge
                                key={i}
                                variant="secondary"
                                className="gap-1"
                              >
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
                      <UiField
                        data-invalid={field.state.meta.errors.length > 0}
                      >
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
                            onClick={() =>
                              addTag(field, genreInput, setGenreInput)
                            }
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
                              <Badge
                                key={i}
                                variant="secondary"
                                className="gap-1"
                              >
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
              </div>
            </div>
          </div>

          {error && (
            <UiField data-invalid className="mt-6">
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            </UiField>
          )}

          <div className="mt-8 flex items-center justify-end gap-3 border-t pt-6">
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
