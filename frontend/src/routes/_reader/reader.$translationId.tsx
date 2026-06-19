import { createFileRoute, useParams } from '@tanstack/react-router'
import { useTranslation } from '#/hooks/useManga'
import { Skeleton } from '#/components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_reader/reader/$translationId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { translationId } = useParams({ from: '/_reader/reader/$translationId' })
  const { data, isLoading, isError, refetch } = useTranslation(Number(translationId))

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
          <Button onClick={() => refetch()} variant="default">Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">{data.chapter.manga.title}</h1>
      <p className="text-zinc-400">
        Chapter {data.chapter.number}{data.chapter.title ? ` — ${data.chapter.title}` : ''}
      </p>
      <p className="text-zinc-500 mt-2">
        {data.language.name} · {data.translator.name}
      </p>
    </div>
  )
}
