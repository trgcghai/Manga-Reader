import { createFileRoute, useParams } from '@tanstack/react-router'
import { useTranslation } from '#/hooks/useManga'
import { useReaderStore } from '#/stores/rootStore'
import { useReaderPages } from '#/hooks/useReaderPages'
import { PageViewer } from '#/components/reader/PageViewer'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_reader/reader/$translationId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { translationId } = useParams({
    from: '/_reader/reader/$translationId',
  })
  const { data, isLoading, isError, refetch } = useTranslation(
    Number(translationId),
  )

  const { currentPage, displayMode } = useReaderStore()
  const nextPage = useReaderStore((s) => s.nextPage)
  const prevPage = useReaderStore((s) => s.prevPage)

  const {
    pages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useReaderPages(data?.url)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-96">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Reader</ErrorTitle>
          <ErrorDescription>
            Could not fetch translation data. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()} variant="default">
            Retry
          </Button>
        </ErrorDisplay>
      </div>
    )
  }

  if (pagesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-96">
          <Skeleton className="h-96 w-full" />
          <p className="text-center text-zinc-500 text-sm">Loading pages...</p>
        </div>
      </div>
    )
  }

  if (pagesError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Pages</ErrorTitle>
          <ErrorDescription>{pagesError.message}</ErrorDescription>
          <Button onClick={() => refetch()} variant="default">
            Retry
          </Button>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div className="relative h-screen">
      <PageViewer
        pages={pages}
        displayMode={displayMode}
        currentPage={currentPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
      />
      <div className="absolute top-4 left-4 text-sm text-zinc-400 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
        {data?.chapter.manga.title} — Ch. {data?.chapter.number}
      </div>
    </div>
  )
}
