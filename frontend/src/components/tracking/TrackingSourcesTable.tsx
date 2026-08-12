import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, Radar, Search, SearchX, X } from 'lucide-react'
import { CheckNowButton } from './CheckNowButton'
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
import { Input } from '#/components/ui/input'
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
  search: string
  onSearchChange: (value: string) => void
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
  search,
  onSearchChange,
}: TrackingSourcesTableProps) {
  const totalPages = data?.totalPages ?? 1
  const trimmedSearch = search.trim()
  const [searchValue, setSearchValue] = useState(search)

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onSearchChange(value)
  }

  return (
    <div className="mt-6">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tracking sources"
          placeholder="Search tracking sources"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => handleSearchChange('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
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
              {trimmedSearch ? <SearchX /> : <Radar />}
            </EmptyMedia>
            <EmptyTitle>
              {trimmedSearch
                ? 'No Sources Match Your Search'
                : 'No Tracking Sources'}
            </EmptyTitle>
            <EmptyDescription>
              {trimmedSearch
                ? `No sources match "${trimmedSearch}". Try a different search term or clear the search.`
                : 'No tracking sources yet. Add tracking sources to get started.'}
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
                    <div className="flex items-center gap-2">
                      <CheckNowButton mangaId={source.mangaId} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onManage(source)}
                      >
                        <Eye className="h-4 w-4" />
                        View sources
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
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  )
}
