import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse, ReadingFlagFilter } from '#/services/api/mangaApi'
import { READING_FLAGS } from '#/services/api/mangaApi'
import { MangaCard } from '#/components/manga/MangaCard'
import { Pagination } from '#/components/ui/pagination'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { getReadingFlagLabel } from '#/lib/mangaUtils'

export const Route = createFileRoute('/_app/flagged')({
  component: FlaggedPage,
})

function FlaggedPage() {
  const [filterFlag, setFilterFlag] = useState<ReadingFlagFilter>('any')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    setPage(1)
  }, [filterFlag])

  const { data, isLoading, isError, refetch } = useMangaList({
    page,
    limit: pageSize,
    readingFlag: filterFlag,
  })

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <Select
            value={filterFlag}
            onValueChange={(v: ReadingFlagFilter) => setFilterFlag(v)}
          >
            <SelectTrigger className="w-40 rounded-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All</SelectItem>
              {READING_FLAGS.map((flag) => (
                <SelectItem key={flag} value={flag} className="capitalize">
                  {getReadingFlagLabel(flag)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border">
              <Skeleton className="aspect-3/4 rounded-t-lg" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <Select
            value={filterFlag}
            onValueChange={(v: ReadingFlagFilter) => setFilterFlag(v)}
          >
            <SelectTrigger className="w-40 rounded-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All</SelectItem>
              {READING_FLAGS.map((flag) => (
                <SelectItem key={flag} value={flag} className="capitalize">
                  {getReadingFlagLabel(flag)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Reading List</ErrorTitle>
          <ErrorDescription>
            Could not fetch manga list. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()}>Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  const isEmpty = !data || data.data.length === 0

  if (isEmpty) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <Select
            value={filterFlag}
            onValueChange={(v: ReadingFlagFilter) => setFilterFlag(v)}
          >
            <SelectTrigger className="w-40 rounded-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All</SelectItem>
              {READING_FLAGS.map((flag) => (
                <SelectItem key={flag} value={flag} className="capitalize">
                  {getReadingFlagLabel(flag)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark />
            </EmptyMedia>
            <EmptyTitle>No flagged mangas</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>
        <Select
          value={filterFlag}
          onValueChange={(v: ReadingFlagFilter) => setFilterFlag(v)}
        >
          <SelectTrigger className="w-40 rounded-full cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All</SelectItem>
            {READING_FLAGS.map((flag) => (
              <SelectItem key={flag} value={flag} className="capitalize">
                {getReadingFlagLabel(flag)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {data.data.map((manga: MangaResponse) => (
          <Link
            key={manga.id}
            to="/manga/$id"
            params={{ id: String(manga.id) }}
          >
            <MangaCard manga={manga} key={manga.id} />
          </Link>
        ))}
      </div>

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        totalItems={data.total}
        pageSize={data.limit}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
