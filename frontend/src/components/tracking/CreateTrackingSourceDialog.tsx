import { useState } from 'react'
import { useCreateTrackingSource } from '#/hooks/useTracking'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'
import { MangaCombobox } from './MangaCombobox'
import { SourceForm } from './SourceForm'
import type { SourceFormValues } from './SourceForm'

interface CreateTrackingSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTrackingSourceDialog({
  open,
  onOpenChange,
}: CreateTrackingSourceDialogProps) {
  const [mangaId, setMangaId] = useState(0)
  const createMutation = useCreateTrackingSource()

  const handleCreate = (values: SourceFormValues) => {
    createMutation.mutate(
      { mangaId, name: values.name.trim(), url: values.url.trim() },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Tracking Source</DialogTitle>
          <DialogDescription>
            Add a new tracking source for a manga.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="create-source-manga" required>
            Manga
          </FieldLabel>
          <FieldContent>
            <MangaCombobox
              id="create-source-manga"
              value={mangaId}
              onChange={setMangaId}
            />
          </FieldContent>
        </Field>

        <SourceForm
          initialValues={{ name: '', url: '' }}
          submitLabel="Create"
          canSubmit={mangaId !== 0}
          isPending={createMutation.isPending}
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
