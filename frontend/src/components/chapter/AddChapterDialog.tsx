import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useLanguageList } from '#/hooks/useLanguages'
import { useTranslatorList } from '#/hooks/useTranslators'
import { useTranslationFileUpload } from '#/hooks/useFile'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Field as UiField,
  FieldLabel,
  FieldError as UiFieldError,
} from '#/components/ui/field'
import { Loader2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useCreateChapterForManga } from '#/hooks/useManga'
import { Badge } from '#/components/ui/badge'

const chapterSchema = z.object({
  number: z.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File, { message: 'CBZ file is required' }),
})

type FormValues = z.infer<typeof chapterSchema>

const defaultValues: FormValues = {
  number: 1,
  title: '',
  languageId: 0,
  translatorId: 0,
  file: null as unknown as File,
}

interface AddChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}

export default function AddChapterDialog({
  open,
  onOpenChange,
  mangaId,
}: AddChapterDialogProps) {
  const createMutation = useCreateChapterForManga(mangaId)
  const uploadMutation = useTranslationFileUpload(mangaId)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)

  const handleFileSelect =
    (field: { handleChange: (v: File) => void }) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      if (!file) return
      field.handleChange(file)
      e.target.value = ''
    }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop =
    (field: { handleChange: (v: File) => void }) => (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files.item(0)
      if (!file) return
      field.handleChange(file)
    }

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open])

  const form = useForm({
    validators: { onSubmit: chapterSchema },
    defaultValues,
    onSubmit: async (values) => {
      try {
        const { url } = await uploadMutation.mutateAsync({
          file: values.value.file,
          chapterNumber: values.value.number,
        })
        createMutation.mutate(
          {
            number: values.value.number,
            title: values.value.title,
            languageId: values.value.languageId,
            translatorId: values.value.translatorId,
            url,
          },
          {
            onSuccess: () => {
              onOpenChange(false)
              form.reset()
            },
          },
        )
      } catch {
        // error displayed via uploadMutation.error
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Chapter</DialogTitle>
          <DialogDescription>
            Create a new chapter with its initial translation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="space-y-4 py-4">
            <form.Field name="number">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-number" required>
                    Chapter Number
                  </FieldLabel>
                  <Input
                    id="chapter-number"
                    type="number"
                    min={0}
                    step={0.1}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
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

            <form.Field name="title">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-title" required>
                    Title
                  </FieldLabel>
                  <Input
                    id="chapter-title"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
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

            <form.Field name="languageId">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-language" required>
                    Language
                  </FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="chapter-language"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    >
                      <SelectValue
                        placeholder={
                          languagesLoading ? 'Loading...' : 'Select language'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {languages?.map((lang) => (
                        <SelectItem key={lang.id} value={String(lang.id)}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="translatorId">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-translator" required>
                    Translator
                  </FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="chapter-translator"
                      aria-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    >
                      <SelectValue
                        placeholder={
                          translatorsLoading
                            ? 'Loading...'
                            : 'Select translator'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {translatorsData?.data.map((tr) => (
                        <SelectItem key={tr.id} value={String(tr.id)}>
                          {tr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="file">
              {(field) => (
                <UiField>
                  <FieldLabel required>CBZ File</FieldLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(field)}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    aria-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    {
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      field.state.value ? (
                        <Badge className="text-sm font-medium">
                          {field.state.value.name}
                        </Badge>
                      ) : (
                        <>
                          <Upload className="size-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Drag and drop your CBZ file here, or click to browse
                          </p>
                          <Button type="button" variant="outline" size="sm">
                            Browse Files
                          </Button>
                        </>
                      )
                    }
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".cbz,application/zip"
                      className="hidden"
                      onChange={handleFileSelect(field)}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                </UiField>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || uploadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || uploadMutation.isPending}
                >
                  {isSubmitting || uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadMutation.isPending
                        ? 'Uploading...'
                        : 'Creating...'}
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>

        {createMutation.error && (
          <p className="px-6 pb-2 text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Failed to create chapter'}
          </p>
        )}
        {uploadMutation.error && (
          <p className="px-6 pb-2 text-sm text-destructive">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Failed to upload file'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
