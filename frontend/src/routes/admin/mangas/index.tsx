import { createFileRoute, Link } from '@tanstack/react-router'
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
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent } from '#/components/ui/card'
import { BookOpenText, Plus } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { formatDate, formatDateTime } from '#/lib/dateTimeFormatter'

const columnHelper = createColumnHelper<MangaResponse>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant="secondary" className="capitalize">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('authors', {
    header: 'Authors',
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue()?.map((a) => (
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
        {info.getValue()?.map((g) => (
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
]

export const Route = createFileRoute('/admin/mangas/')({
  component: MangaListPage,
})

function MangaListPage() {
  const { data, isLoading, isError } = useMangaList(1, 20)

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-6 text-red-700">
          Failed to load mangas. Make sure the backend is running.
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mangas</h1>
        <Button asChild>
          <Link to="/admin/mangas/new" className="no-underline">
            <Plus className="h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      {!data?.data.length && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>No Mangas Found</EmptyTitle>
            <EmptyDescription>
              No mangas available at the moment.
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
        </div>
      )}
    </div>
  )
}
