import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useLanguageList } from '#/hooks/useLanguages'
import { useTranslatorList } from '#/hooks/useTranslators'
import { Button } from '#/components/ui/button'
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
import { useUpdateTranslation } from '#/hooks/useManga'
import { useTranslationFileUpload } from '#/hooks/useFile'
import type {
  TranslationDetail,
  UpdateTranslationPayload,
} from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { FileDropzone } from '#/components/ui/file-dropzone'

const translationSchema = z.object({
  languageId: z.number().optional(),
  translatorId: z.number().optional(),
  file: z.instanceof(File).optional(),
})

type FormValues = z.infer<typeof translationSchema>

interface EditTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
  chapterId: number
  chapterNumber: number
  translation: TranslationDetail
}

export default function EditTranslationDialog({
  open,
  onOpenChange,
  mangaId,
  chapterId,
  chapterNumber,
  translation,
}: EditTranslationDialogProps) {
  const updateMutation = useUpdateTranslation(mangaId, chapterId)
  const uploadMutation = useTranslationFileUpload(mangaId)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)

  const defaultValues: FormValues = {
    languageId: translation.language.id,
    translatorId: translation.translator.id,
  }

  const form = useForm({
    validators: { onSubmit: translationSchema },
    defaultValues,
    onSubmit: async (values) => {
      try {
        const payload: UpdateTranslationPayload = {}

        if (values.value.languageId) {
          payload.languageId = values.value.languageId
        }
        if (values.value.translatorId) {
          payload.translatorId = values.value.translatorId
        }
        if (values.value.file) {
          const { url } = await uploadMutation.mutateAsync({
            file: values.value.file,
            chapterNumber,
          })
          payload.url = url
        }

        updateMutation.mutate(
          {
            translationId: translation.id,
            data: payload,
          },
          {
            onSuccess: () => {
              onOpenChange(false)
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
          <DialogTitle>Edit Translation</DialogTitle>
          <DialogDescription>
            Update the translation details for {translation.language.name} by{' '}
            {translation.translator.name}.
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
                  <FieldLabel htmlFor="edit-translation-language">
                    Language
                  </FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="edit-translation-language"
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
                  <FieldLabel htmlFor="edit-translation-translator">
                    Translator
                  </FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger
                      id="edit-translation-translator"
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
                  <FieldLabel>CBZ File</FieldLabel>
                  <FileDropzone
                    accept={{ 'application/zip': ['.cbz', '.zip'] }}
                    value={field.state.value}
                    onFileSelect={(file) => field.handleChange(file!)}
                    error={field.state.meta.errors[0]?.message}
                    message="Drag and drop a new CBZ file here, or click to browse"
                    hint="CBZ, ZIP"
                    selectedDisplay="badge"
                  />
                  {translation.url && (
                    <div className="flex items-center gap-2">
                      Current file: <Badge>{translation.url.split('/').pop()}</Badge>
                    </div>
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
                      {uploadMutation.isPending ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : (
                    'Save'
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
