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

const chapterSchema = z.object({
  number: z.coerce.number().min(0, 'Number is required'),
  title: z.string().min(1, 'Title is required'),
  releaseDate: z.string().optional(),
  note: z.string().optional(),
  languageId: z.coerce.number({ required_error: 'Language is required' }),
  translatorId: z.coerce.number({ required_error: 'Translator is required' }),
  folderPath: z.string().min(1, 'Folder path is required'),
})

type FormValues = z.infer<typeof chapterSchema>

const defaultValues: FormValues = {
  number: 1,
  title: '',
  releaseDate: '',
  note: '',
  languageId: 0 as unknown as number,
  translatorId: 0 as unknown as number,
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
                  <FieldLabel>Chapter Number</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="title">
              {(field) => (
                <UiField>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="releaseDate">
              {(field) => (
                <UiField>
                  <FieldLabel>Release Date</FieldLabel>
                  <Input
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="note">
              {(field) => (
                <UiField>
                  <FieldLabel>Note</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </UiField>
              )}
            </form.Field>

            <form.Field name="languageId">
              {(field) => (
                <UiField>
                  <FieldLabel>Language</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger>
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
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="translatorId">
              {(field) => (
                <UiField>
                  <FieldLabel>Translator</FieldLabel>
                  <Select
                    value={String(field.state.value || '')}
                    onValueChange={(v) => field.handleChange(Number(v))}
                  >
                    <SelectTrigger>
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
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
                  )}
                </UiField>
              )}
            </form.Field>

            <form.Field name="folderPath">
              {(field) => (
                <UiField>
                  <FieldLabel>Folder Path</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="/chapters/volume-1/chapter-1"
                  />
                  {field.state.meta.errors && (
                    <UiFieldError>{field.state.meta.errors}</UiFieldError>
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
      </DialogContent>
    </Dialog>
  )
}
