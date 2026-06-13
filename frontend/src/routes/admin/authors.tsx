import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuthorList, useDeleteAuthor } from '#/hooks/useAuthors'
import { useDebounce } from '#/hooks/useDebounce'
import type { AuthorResponse } from '#/services/api/authorApi'
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
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import AddAuthorDialog from '#/components/author/AddAuthorDialog'
import EditAuthorDialog from '#/components/author/EditAuthorDialog'
import { Pagination } from '#/components/ui/pagination'

export const Route = createFileRoute('/admin/authors')({
  component: AdminAuthorsPage,
})

function AdminAuthorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [addOpen, setAddOpen] = useState(false)
  const [editAuthor, setEditAuthor] = useState<AuthorResponse | null>(null)
  const [deleteAuthor, setDeleteAuthor] = useState<AuthorResponse | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const deleteMutation = useDeleteAuthor()

  const { data, isLoading, isError } = useAuthorList(
    page,
    pageSize,
    debouncedSearch || undefined,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Authors</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Author
        </Button>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search authors..."
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
            Failed to load authors. Make sure the backend is running.
          </CardContent>
        </Card>
      )}

      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No Authors Found</EmptyTitle>
            <EmptyDescription>
              {debouncedSearch
                ? 'No authors match your search.'
                : 'No authors have been added yet.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Author
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
              {data.data.map((author) => (
                <TableRow key={author.id}>
                  <TableCell className="font-medium">{author.name}</TableCell>
                  <TableCell>{author.mangaCount ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditAuthor(author)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteAuthor(author)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={data.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <AddAuthorDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditAuthorDialog
        author={editAuthor}
        onClose={() => setEditAuthor(null)}
      />
      <DeleteConfirmDialog
        open={!!deleteAuthor}
        onOpenChange={(open) => {
          if (!open) setDeleteAuthor(null)
        }}
        title="Delete Author"
        entityName={deleteAuthor?.name ?? ''}
        onConfirm={() => {
          if (!deleteAuthor) return
          deleteMutation.mutate(deleteAuthor.id, {
            onSuccess: () => setDeleteAuthor(null),
          })
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
