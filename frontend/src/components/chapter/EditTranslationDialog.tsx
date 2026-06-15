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
import { useEffect } from 'react'
import { useUpdateTranslation } from '#/hooks/useManga'
import type { TranslationDetail } from '#/services/api/mangaApi'

const translationSchema = z.object({
  languageId: z.number().refine((n) => n > 0, 'Language is required'),
  translatorId: z.number().refine((n) => n > 0, 'Translator is required'),
  folderPath: z.string().min(1, 'Folder path is required'),
})

type FormValues = z.infer<typeof translationSchema>

interface EditTranslationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
  chapterId: number
  translation: TranslationDetail
}

export default function EditTranslationDialog({
  open,
  onOpenChange,
  mangaId,
  chapterId,
  translation,
}: EditTranslationDialogProps) {
  const updateMutation = useUpdateTranslation(mangaId)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)

  const defaultValues: FormValues = {
    languageId: translation.language.id,
    translatorId: translation.translator.id,
    folderPath: translation.folderPath,
  }

  const form = useForm({
    validators: { onSubmit: translationSchema },
    defaultValues,
    onSubmit: async (values) => {
      updateMutation.mutate(
        {
          chapterId,
          translationId: translation.id,
          data: {
            languageId: values.value.languageId,
            translatorId: values.value.translatorId,
            folderPath: values.value.folderPath,
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

            <form.Field name="folderPath">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="edit-translation-folder-path" required>
                    Folder Path
                  </FieldLabel>
                  <Input
                    id="edit-translation-folder-path"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="/chapters/volume-1/chapter-1"
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
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>

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
