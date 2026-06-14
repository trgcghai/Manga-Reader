import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslatorList, useDeleteTranslator } from '#/hooks/useTranslators'
import { useDebounce } from '#/hooks/useDebounce'
import type { TranslatorResponse } from '#/services/api/translatorApi'
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
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'
import { Pencil, Plus, Trash2, Languages } from 'lucide-react'
import AddTranslatorDialog from '#/components/translator/AddTranslatorDialog'
import EditTranslatorDialog from '#/components/translator/EditTranslatorDialog'
import { Pagination } from '#/components/ui/pagination'

export const Route = createFileRoute('/admin/translators')({
  component: AdminTranslatorsPage,
})

function AdminTranslatorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [addOpen, setAddOpen] = useState(false)
  const [editTranslator, setEditTranslator] =
    useState<TranslatorResponse | null>(null)
  const [deleteTranslator, setDeleteTranslator] =
    useState<TranslatorResponse | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const deleteMutation = useDeleteTranslator()

  const { data, isLoading, isError } = useTranslatorList(
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
        <h1 className="text-2xl font-bold">Translators</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Translator
        </Button>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search translators..."
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
        <ErrorDisplay className="mt-6">
          <ErrorTitle>Failed to Load Translators</ErrorTitle>
          <ErrorDescription>
            Make sure the backend is running.
          </ErrorDescription>
        </ErrorDisplay>
      )}

      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Languages />
            </EmptyMedia>
            <EmptyTitle>No Translators Found</EmptyTitle>
            <EmptyDescription>
              {debouncedSearch
                ? 'No translators match your search.'
                : 'No translators have been added yet.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Translator
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
                  Note
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((translator) => (
                <TableRow key={translator.id}>
                  <TableCell className="font-medium">
                    {translator.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {translator.note ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditTranslator(translator)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTranslator(translator)}
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

      <AddTranslatorDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditTranslatorDialog
        translator={editTranslator}
        onClose={() => setEditTranslator(null)}
      />
      <DeleteConfirmDialog
        open={!!deleteTranslator}
        onOpenChange={(open) => {
          if (!open) setDeleteTranslator(null)
        }}
        title="Delete Translator"
        entityName={deleteTranslator?.name ?? ''}
        onConfirm={() => {
          if (!deleteTranslator) return
          deleteMutation.mutate(deleteTranslator.id, {
            onSuccess: () => setDeleteTranslator(null),
          })
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
