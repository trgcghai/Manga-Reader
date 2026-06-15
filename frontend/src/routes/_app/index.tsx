import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
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
import { BookOpen } from 'lucide-react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/')({
  component: LibraryPage,
})

function LibraryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, isError, refetch } = useMangaList(page, pageSize)

  if (isLoading) {
    return (
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
    )
  }

  if (isError) {
    return (
      <ErrorDisplay>
        <ErrorTitle>Failed to Load Library</ErrorTitle>
        <ErrorDescription>
          Could not fetch manga list. The backend may be unavailable.
        </ErrorDescription>
        <Button onClick={() => refetch()}>Retry</Button>
      </ErrorDisplay>
    )
  }

  if (!data || data.data.length === 0) {
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {data.data.map((manga: MangaResponse) => (
          <MangaCard key={manga.id} manga={manga} />
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
