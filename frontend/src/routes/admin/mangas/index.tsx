import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import { useState, useRef, useEffect, useCallback } from 'react'
import { BookOpenText, Plus, Upload, X } from 'lucide-react'
import { ImportDialog } from '#/components/manga/ImportDialog'
import { Pagination } from '#/components/ui/pagination'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { formatDateTime } from '#/lib/dateTimeFormatter'
import ActionsCell from '#/components/manga/ActionCell'
import { getStatusVariant } from '#/lib/mangaUtils'
import { useDebounce } from '#/hooks/useDebounce'

const columnHelper = createColumnHelper<MangaResponse>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const variant = getStatusVariant(info.getValue())
      return (
        <Badge variant={variant} className="capitalize">
          {info.getValue()}
        </Badge>
      )
    },
  }),
  columnHelper.accessor('authors', {
    header: 'Authors',
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((a) => (
          <Badge key={a.id} variant="outline" className="capitalize">
            {a.name}
          </Badge>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor('genres', {
    header: 'Genres',
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((g) => (
          <Badge key={g.id} variant="outline" className="capitalize">
            {g.name}
          </Badge>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => <ActionsCell manga={info.row.original} />,
  }),
]

interface MangaListSearch {
  search?: string
  status?: string
}

export const Route = createFileRoute('/admin/mangas/')({
  validateSearch: (search: Record<string, string | undefined>): MangaListSearch => ({
    search: search.search || undefined,
    status: search.status || undefined,
  }),
  component: MangaListPage,
})

function MangaListPage() {
  const navigate = useNavigate()
  const { search, status } = Route.useSearch()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [importOpen, setImportOpen] = useState(false)

  const [searchInput, setSearchInput] = useState(search ?? '')
  const [statusInput, setStatusInput] = useState(status ?? '')

  const debouncedSearch = useDebounce(searchInput, 500)

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
    navigate({
      to: '/admin/mangas',
      search: {
        search: debouncedSearch || undefined,
        status: statusInput && statusInput !== 'all' ? statusInput : undefined,
      },
    })
  }, [debouncedSearch, statusInput, navigate])

  const { data, isLoading, isError } = useMangaList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusInput && statusInput !== 'all' ? statusInput : undefined,
  })

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setStatusInput('')
    setPage(1)
    navigate({ to: '/admin/mangas', search: {} })
  }, [navigate])

  const hasFilters = searchInput || statusInput

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Mangas</h1>
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorDisplay className="mt-6">
        <ErrorTitle>Failed to Load Mangas</ErrorTitle>
        <ErrorDescription>Make sure the backend is running.</ErrorDescription>
      </ErrorDisplay>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mangas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button asChild>
            <Link to="/admin/mangas/new" className="no-underline">
              <Plus className="h-4 w-4" />
              Create New
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by title, description, author, or genre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xl"
        />
        <Select value={statusInput} onValueChange={setStatusInput}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="default" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {!data?.data.length && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>No Mangas Found</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? 'No mangas match the current filters.'
                : 'No mangas available at the moment.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/admin/mangas/new" className="no-underline">
                <Plus className="h-4 w-4" />
                Create New
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <div className="mt-6">
          <Table className="border">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-base font-semibold text-muted-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: '/admin/mangas/$id',
                      params: { id: String(row.original.id) },
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => {
                        if (cell.column.id === 'actions') e.stopPropagation()
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalItems={data.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
