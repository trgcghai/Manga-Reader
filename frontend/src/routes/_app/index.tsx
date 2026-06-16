import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import { MangaCard } from '#/components/manga/MangaCard'
import { LibraryFilterBar } from '#/components/library/LibraryFilterBar'
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
import { BookOpen } from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/')({
  component: LibraryPage,
})

function LibraryPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const { data, isLoading, isError, refetch } = useMangaList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status !== 'all' ? status : undefined,
  })

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <LibraryFilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
          />
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
        <div className="mb-6">
          <LibraryFilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
          />
        </div>
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Library</ErrorTitle>
          <ErrorDescription>
            Could not fetch manga list. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()}>Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  const hasFilters = !!debouncedSearch || (!!status && status !== 'all')
  const isEmpty = !data || data.data.length === 0

  if (isEmpty && !hasFilters) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No mangas in the library yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <LibraryFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      </div>

      {isEmpty && hasFilters ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No mangas match your filters</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
            {data!.data.map((manga: MangaResponse) => (
              <Link
                key={manga.id}
                to="/manga/$id"
                params={{ id: String(manga.id) }}
              >
                <MangaCard manga={manga} />
              </Link>
            ))}
          </div>

          <Pagination
            page={data!.page}
            totalPages={data!.totalPages}
            totalItems={data!.total}
            pageSize={data!.limit}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  )
}
