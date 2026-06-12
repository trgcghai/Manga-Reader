import { useEffect, useState } from 'react'
import { useUpdateGenre } from '#/hooks/useGenres'
import type { GenreResponse } from '#/services/api/genreApi'
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

const EditGenreDialog = ({
  genre,
  onClose,
}: {
  genre: GenreResponse | null
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const updateMutation = useUpdateGenre()

  useEffect(() => {
    if (genre) setName(genre.name)
  }, [genre])

  const handleSave = () => {
    if (!genre || !name.trim() || updateMutation.isPending) return
    updateMutation.mutate(
      { id: genre.id, data: { name: name.trim() } },
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
      open={!!genre}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Genre</DialogTitle>
          <DialogDescription>Update the genre name.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Genre name"
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

export default EditGenreDialog
