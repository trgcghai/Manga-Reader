import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  useGenreList,
  useCreateGenre,
  useUpdateGenre,
  useDeleteGenre,
} from '#/hooks/useGenres'
import type { GenreResponse } from '#/services/api/genreApi'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '#/components/ui/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Card, CardContent } from '#/components/ui/card'
import { Loader2, Pencil, Plus, Trash2, Layers } from 'lucide-react'

export const Route = createFileRoute('/admin/genres')({
  component: AdminGenresPage,
})

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function AdminGenresPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editGenre, setEditGenre] = useState<GenreResponse | null>(null)
  const [deleteGenre, setDeleteGenre] = useState<GenreResponse | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError } = useGenreList(
    page,
    20,
    debouncedSearch || undefined,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Genres</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Genre
        </Button>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="mt-6 border-red-300 bg-red-50">
          <CardContent className="p-6 text-red-700">
            Failed to load genres. Make sure the backend is running.
          </CardContent>
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers />
            </EmptyMedia>
            <EmptyTitle>No Genres Found</EmptyTitle>
            <EmptyDescription>
              {debouncedSearch
                ? 'No genres match your search.'
                : 'No genres have been added yet.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Genre
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <div className="mt-6">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Mangas
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((genre) => (
                <TableRow key={genre.id}>
                  <TableCell className="font-medium">{genre.name}</TableCell>
                  <TableCell>{genre.mangaCount ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditGenre(genre)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteGenre(genre)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <AddGenreDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditGenreDialog
        genre={editGenre}
        onClose={() => setEditGenre(null)}
      />
      <DeleteGenreDialog
        genre={deleteGenre}
        onClose={() => setDeleteGenre(null)}
      />
    </div>
  )
}

function AddGenreDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const createMutation = useCreateGenre()

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
          <DialogTitle>Add Genre</DialogTitle>
          <DialogDescription>
            Enter the name of the new genre.
          </DialogDescription>
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

function EditGenreDialog({
  genre,
  onClose,
}: {
  genre: GenreResponse | null
  onClose: () => void
}) {
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

function DeleteGenreDialog({
  genre,
  onClose,
}: {
  genre: GenreResponse | null
  onClose: () => void
}) {
  const deleteMutation = useDeleteGenre()

  const handleDelete = () => {
    if (!genre || deleteMutation.isPending) return
    deleteMutation.mutate(genre.id, {
      onSuccess: () => onClose(),
    })
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
          <DialogTitle>Delete Genre</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{genre?.name}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
