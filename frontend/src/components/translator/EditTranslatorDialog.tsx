import { useEffect, useState } from 'react'
import { useUpdateTranslator } from '#/hooks/useTranslators'
import type { TranslatorResponse } from '#/services/api/translatorApi'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Loader2 } from 'lucide-react'

const EditTranslatorDialog = ({
  translator,
  onClose,
}: {
  translator: TranslatorResponse | null
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const updateMutation = useUpdateTranslator()

  useEffect(() => {
    if (translator) {
      setName(translator.name)
      setNote(translator.note ?? '')
    }
  }, [translator])

  const handleSave = () => {
    if (!translator || !name.trim() || updateMutation.isPending) return
    updateMutation.mutate(
      {
        id: translator.id,
        data: { name: name.trim(), note: note.trim() || undefined },
      },
      {
        onSuccess: () => {
          setName('')
          setNote('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={!!translator}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Translator</DialogTitle>
          <DialogDescription>
            Update the translator's name and note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Translator name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <Textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTranslatorDialog
