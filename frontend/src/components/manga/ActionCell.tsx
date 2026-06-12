import { useNavigate } from '@tanstack/react-router'
import { useDeleteManga } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import { Button } from '#/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'

const ActionsCell = ({ manga }: { manga: MangaResponse }) => {
  const navigate = useNavigate()
  const deleteMutation = useDeleteManga()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="xs"
        onClick={() =>
          navigate({
            to: '/admin/mangas/$id/edit',
            params: { id: String(manga.id) },
          })
        }
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Manga"
        entityName={manga.title}
        onConfirm={() => {
          deleteMutation.mutate(manga.id, {
            onSuccess: () => setOpen(false),
          })
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}

export default ActionsCell
