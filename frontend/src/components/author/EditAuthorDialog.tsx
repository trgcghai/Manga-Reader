import { useEffect, useState } from 'react'
import { useUpdateAuthor } from '#/hooks/useAuthors'
import type { AuthorResponse } from '#/services/api/authorApi'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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

const EditAuthorDialog = ({
  author,
  onClose,
}: {
  author: AuthorResponse | null
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const updateMutation = useUpdateAuthor()

  useEffect(() => {
    if (author) setName(author.name)
  }, [author])

  const handleSave = () => {
    if (!author || !name.trim() || updateMutation.isPending) return
    updateMutation.mutate(
      { id: author.id, data: { name: name.trim() } },
      {
        onSuccess: () => {
          setName('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={!!author}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Author</DialogTitle>
          <DialogDescription>Update the author's name.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Author name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
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

export default EditAuthorDialog
