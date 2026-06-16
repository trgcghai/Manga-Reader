import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useManga } from '#/hooks/useManga'
import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { MangaDetailHeader } from '#/components/manga/MangaDetailHeader'
import { ChapterList } from '#/components/manga/ChapterList'
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
import { Button } from '#/components/ui/button'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/_app/manga/$id')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/_app/manga/$id' })
  const mangaId = Number(id)
  const { data, isLoading, isError, refetch } = useManga(mangaId, {
    include: 'chapters,translations',
  })
  const manga = data as MangaDetailResponse | undefined

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-6 md:flex-row">
          <Skeleton className="aspect-3/4 w-full rounded-xl md:w-72" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Library
        </Link>
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Manga</ErrorTitle>
          <ErrorDescription>
            Could not fetch manga details. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()}>Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  if (!manga) {
    return (
      <div>
        <Button variant="link" className="px-0">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to Library
          </Link>
        </Button>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Manga not found</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Library
      </Link>

      <MangaDetailHeader manga={manga} />
      <Separator className="mt-4 mb-8" />
      <ChapterList chapters={manga.chapters} />
    </div>
  )
}
