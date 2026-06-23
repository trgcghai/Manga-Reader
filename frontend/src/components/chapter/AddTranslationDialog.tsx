import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useLanguageList } from '#/hooks/useLanguages'
import { Button } from '#/components/ui/button'
import { TranslatorCombobox } from '#/components/translator/TranslatorCombobox'
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
import { useCreateChapterForManga } from '#/hooks/useManga'
import { useTranslationFileUpload } from '#/hooks/useFile'
import { FileDropzone } from '#/components/ui/file-dropzone'

const translationSchema = z.object({
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File, { message: 'CBZ file is required' }),
})

type FormValues = z.infer<typeof translationSchema>

const defaultValues: FormValues = {
  languageId: 0,
  translatorId: 0,
  file: null as unknown as File,
}

interface AddTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
  chapterNumber: string
  chapterTitle?: string
}

export default function AddTranslationDialog({
  open,
  onOpenChange,
  mangaId,
  chapterNumber,
  chapterTitle,
}: AddTranslationDialogProps) {
  const createMutation = useCreateChapterForManga(mangaId)
  const uploadMutation = useTranslationFileUpload(mangaId)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()

  const form = useForm({
    validators: { onSubmit: translationSchema },
    defaultValues,
    onSubmit: async (values) => {
      try {
        const { url } = await uploadMutation.mutateAsync({
          file: values.value.file,
          chapterNumber: parseFloat(chapterNumber),
        })
        createMutation.mutate(
          {
            number: parseFloat(chapterNumber),
            title: chapterTitle ?? '',
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

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Translation</DialogTitle>
          <DialogDescription>
            Add a new translation to chapter {chapterNumber}
            {chapterTitle ? ` - ${chapterTitle}` : ''}.
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
            <form.Field name="languageId">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="translation-language" required>
                    Language
                  </FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="translation-language"
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
                  <FieldLabel htmlFor="translation-translator" required>
                    Translator
                  </FieldLabel>
                  <TranslatorCombobox
                    id="translation-translator"
                    value={field.state.value}
                    onChange={(id) => field.handleChange(id)}
                    invalid={field.state.meta.errors.length > 0 || undefined}
                  />
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
                  <FileDropzone
                    accept={{ 'application/zip': ['.zip'] }}
                    value={field.state.value}
                    onFileSelect={(file) => field.handleChange(file!)}
                    error={field.state.meta.errors[0]?.message}
                    message="Drag and drop your CBZ file here, or click to browse"
                    hint="CBZ, ZIP"
                    selectedDisplay="badge"
                  />
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
                      {uploadMutation.isPending ? 'Uploading...' : 'Adding...'}
                    </>
                  ) : (
                    'Add Translation'
                  )}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
