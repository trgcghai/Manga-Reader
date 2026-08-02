import { Link } from '@tanstack/react-router'
import { Radar } from 'lucide-react'
import type {
  PaginatedTrackingSourceResponse,
  TrackingSourceResponse,
} from '#/services/api/trackingApi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  ErrorAction,
  ErrorDescription,
  ErrorDisplay,
  ErrorTitle,
} from '#/components/ui/error-display'
import { Pagination } from '#/components/ui/pagination'
import { formatDateTime } from '#/lib/dateTimeFormatter'

interface TrackingSourcesTableProps {
  data?: PaginatedTrackingSourceResponse
  isLoading: boolean
  isError: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRetry: () => void
  onManage: (source: TrackingSourceResponse) => void
}

export function TrackingSourcesTable({
  data,
  isLoading,
  isError,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onManage,
}: TrackingSourcesTableProps) {
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="mt-6">
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Tracking Sources</ErrorTitle>
          <ErrorDescription>Make sure the backend is running.</ErrorDescription>
          <ErrorAction>
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </ErrorAction>
        </ErrorDisplay>
      )}

      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Radar />
            </EmptyMedia>
            <EmptyTitle>No Tracking Sources</EmptyTitle>
            <EmptyDescription>
              No tracking sources yet. Add tracking sources to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <>
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Manga Title
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Source Name
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Latest Found
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Last Checked
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <Link
                      to="/admin/mangas/$id"
                      params={{ id: String(source.mangaId) }}
                      className="font-medium hover:underline"
                    >
                      {source.manga?.title ?? `Manga #${source.mangaId}`}
                    </Link>
                  </TableCell>
                  <TableCell>{source.name}</TableCell>
                  <TableCell>{source.latestChapterNumber ?? '-'}</TableCell>
                  <TableCell>{formatDateTime(source.updatedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManage(source)}
                    >
                      Manage
                    </Button>
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
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  )
}
