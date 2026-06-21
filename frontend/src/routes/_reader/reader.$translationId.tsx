import { useCallback, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from '#/hooks/useManga'
import { useReaderStore } from '#/stores/rootStore'
import { useReaderPages } from '#/hooks/useReaderPages'
import { PageViewer } from '#/components/reader/PageViewer'
import { useReaderKeyboard } from '#/hooks/useReaderKeyboard'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import { Button } from '#/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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

  const { currentPage, displayMode, totalPages, setCurrentPage } = useReaderStore()
  const nextPage = useReaderStore((s) => s.nextPage)
  const prevPage = useReaderStore((s) => s.prevPage)
  const navigate = useNavigate()
  const pendingDirection = useRef<'next' | 'prev' | null>(null)

  const {
    pages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useReaderPages(data?.url)

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      nextPage()
    } else if (data?.nextTranslationId) {
      pendingDirection.current = 'next'
      navigate({
        to: '/reader/$translationId',
        params: { translationId: String(data.nextTranslationId) },
      })
    } else {
      toast.info('This is the latest chapter')
    }
  }, [currentPage, totalPages, nextPage, data?.nextTranslationId, navigate])

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      prevPage()
    } else if (data?.prevTranslationId) {
      pendingDirection.current = 'prev'
      navigate({
        to: '/reader/$translationId',
        params: { translationId: String(data.prevTranslationId) },
      })
    } else {
      toast.info('This is the first chapter')
    }
  }, [currentPage, prevPage, data?.prevTranslationId, navigate])

  useEffect(() => {
    if (pages.length > 0 && pendingDirection.current) {
      if (pendingDirection.current === 'next') {
        setCurrentPage(0)
      } else {
        setCurrentPage(pages.length - 1)
      }
      pendingDirection.current = null
    }
  }, [pages])

  useReaderKeyboard({
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    enabled: pages.length > 0,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
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
        <Loader2 className="animate-spin" size={48} />
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
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />
      <div className="absolute top-4 left-4 text-sm text-zinc-400 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
        {data?.chapter.manga.title} — Ch. {data?.chapter.number}
      </div>
    </div>
  )
}
