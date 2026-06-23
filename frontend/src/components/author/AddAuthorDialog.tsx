import { useState } from 'react'
import { useCreateAuthor } from '#/hooks/useAuthors'
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

const AddAuthorDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [name, setName] = useState('')
  const createMutation = useCreateAuthor()

  const handleSave = () => {
    if (!name.trim() || createMutation.isPending) return
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Author</DialogTitle>
          <DialogDescription>
            Enter the name of the new author.
          </DialogDescription>
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
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
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

export default AddAuthorDialog
