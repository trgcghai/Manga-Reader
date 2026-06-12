import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useGenreList, useDeleteGenre } from '#/hooks/useGenres'
import { useDebounce } from '#/hooks/useDebounce'
import type { GenreResponse } from '#/services/api/genreApi'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
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
import { Pencil, Plus, Trash2, Layers } from 'lucide-react'
import AddGenreDialog from '#/components/genre/AddGenreDialog'
import EditGenreDialog from '#/components/genre/EditGenreDialog'

export const Route = createFileRoute('/admin/genres')({
  component: AdminGenresPage,
})

function AdminGenresPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editGenre, setEditGenre] = useState<GenreResponse | null>(null)
  const [deleteGenre, setDeleteGenre] = useState<GenreResponse | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const deleteMutation = useDeleteGenre()

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
      <EditGenreDialog genre={editGenre} onClose={() => setEditGenre(null)} />
      <DeleteConfirmDialog
        open={!!deleteGenre}
        onOpenChange={(open) => {
          if (!open) setDeleteGenre(null)
        }}
        title="Delete Genre"
        entityName={deleteGenre?.name ?? ''}
        onConfirm={() => {
          if (!deleteGenre) return
          deleteMutation.mutate(deleteGenre.id, {
            onSuccess: () => setDeleteGenre(null),
          })
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
