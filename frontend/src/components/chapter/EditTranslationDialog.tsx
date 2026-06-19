import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useLanguageList } from '#/hooks/useLanguages'
import { useTranslatorList } from '#/hooks/useTranslators'
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
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUpdateTranslation } from '#/hooks/useManga'
import { useTranslationFileUpload } from '#/hooks/useFile'
import type { TranslationDetail } from '#/services/api/mangaApi'

const translationSchema = z.object({
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  file: z.instanceof(File).nullable().optional(),
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
  const [showFileInput, setShowFileInput] = useState(false)
  const uploadMutation = useTranslationFileUpload(mangaId)
  const existingFileName = translation.url.split('/').pop() ?? 'current file'
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
      let url = translation.url
      if (values.value.file) {
        try {
          const result = await uploadMutation.mutateAsync({
            file: values.value.file,
            chapterNumber,
          })
          url = result.url
        } catch {
          return
        }
      }
      updateMutation.mutate(
        {
          translationId: translation.id,
          data: {
            languageId: values.value.languageId,
            translatorId: values.value.translatorId,
            url,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        },
      )
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
                  <FieldLabel htmlFor="edit-translation-language" required>
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
                  <FieldLabel htmlFor="edit-translation-translator" required>
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
                  <FieldLabel htmlFor="edit-translation-file">
                    CBZ File
                  </FieldLabel>
                  {showFileInput ? (
                    <div className="space-y-2">
                      <Input
                        id="edit-translation-file"
                        type="file"
                        accept=".cbz,application/zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          field.handleChange(file)
                        }}
                      />
                      {field.state.value && (
                        <p className="text-sm text-muted-foreground">
                          {field.state.value.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {existingFileName}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFileInput(true)}
                      >
                        Replace
                      </Button>
                    </div>
                  )}
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
                <Button type="submit" disabled={isSubmitting || uploadMutation.isPending}>
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

        {uploadMutation.error && (
          <p className="px-6 pb-2 text-sm text-destructive">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Failed to upload file'}
          </p>
        )}
        {updateMutation.error && (
          <p className="px-6 pb-2 text-sm text-destructive">
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : 'Failed to update translation'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
