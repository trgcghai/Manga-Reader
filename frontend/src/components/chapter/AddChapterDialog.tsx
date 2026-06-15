import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useCreateChapter } from '#/hooks/useChapters'
import { useLanguageList } from '#/hooks/useLanguages'
import { useTranslatorList } from '#/hooks/useTranslators'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
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
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

const chapterSchema = z.object({
  number: z.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  releaseDate: z.string().optional(),
  note: z.string().optional(),
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  folderPath: z.string().min(1, 'Folder path is required'),
})

type FormValues = z.infer<typeof chapterSchema>

const defaultValues: FormValues = {
  number: 1,
  title: '',
  releaseDate: '',
  note: '',
  languageId: 0,
  translatorId: 0,
  folderPath: '',
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
  const createMutation = useCreateChapter(mangaId)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open])

  const form = useForm({
    validators: { onSubmit: chapterSchema },
    defaultValues,
    onSubmit: async (values) => {
      createMutation.mutate(values.value, {
        onSuccess: () => {
          onOpenChange(false)
          form.reset()
        },
      })
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
                  <FieldLabel htmlFor="chapter-number" required>Chapter Number</FieldLabel>
                  <Input
                    id="chapter-number"
                    type="number"
                    min={0}
                    step={0.1}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    aria-invalid={field.state.meta.errors.length > 0 || undefined}
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
                  <FieldLabel htmlFor="chapter-title" required>Title</FieldLabel>
                  <Input
                    id="chapter-title"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0 || undefined}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="releaseDate">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-release-date">Release Date</FieldLabel>
                  <Input
                    id="chapter-release-date"
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0 || undefined}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="note">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-note">Note</FieldLabel>
                  <Textarea
                    id="chapter-note"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={field.state.meta.errors.length > 0 || undefined}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="languageId">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-language" required>Language</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="chapter-language"
                      aria-invalid={field.state.meta.errors.length > 0 || undefined}
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
                  <FieldLabel htmlFor="chapter-translator" required>Translator</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="chapter-translator"
                      aria-invalid={field.state.meta.errors.length > 0 || undefined}
                    >
                      <SelectValue
                        placeholder={
                          translatorsLoading ? 'Loading...' : 'Select translator'
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

            <form.Field name="folderPath">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-folder-path" required>Folder Path</FieldLabel>
                  <Input
                    id="chapter-folder-path"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="/chapters/volume-1/chapter-1"
                    aria-invalid={field.state.meta.errors.length > 0 || undefined}
                  />
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
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
      </DialogContent>
    </Dialog>
  )
}
