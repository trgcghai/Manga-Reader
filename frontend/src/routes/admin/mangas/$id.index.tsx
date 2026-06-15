import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useManga } from '#/hooks/useManga'
import type { MangaDetailResponse, ChapterDetail } from '#/services/api/mangaApi'
import { Skeleton } from '#/components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyContent } from '#/components/ui/empty'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '#/components/ui/table'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '#/components/ui/collapsible'
import { ChevronDown, ChevronRight, BookOpen, Pencil, ArrowLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '#/lib/dateTimeFormatter'

export const Route = createFileRoute('/admin/mangas/$id/')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/admin/mangas/$id/' })
  const navigate = useNavigate()
  const mangaId = Number(id)
  const { data, isLoading, isError } = useManga(mangaId, {
    include: 'chapters,translations',
  })
  const manga = data as MangaDetailResponse | undefined

  const badgeVariant =
        manga?.status === 'completed'
          ? 'default'
          : manga?.status === 'ongoing'
            ? 'outline'
            : 'destructive'

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !manga) {
    return (
      <div>
        <ErrorDisplay className="mt-6">
          <ErrorTitle>Failed to Load Manga</ErrorTitle>
          <ErrorDescription>
            The manga may not exist or the backend is unavailable.
          </ErrorDescription>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/mangas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{manga.title}</h1>
          <Badge variant={badgeVariant} className="capitalize">
            {manga.status}
          </Badge>
        </div>
        <Button
          onClick={() =>
            navigate({ to: '/admin/mangas/$id/edit', params: { id } })
          }
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit Manga
        </Button>
      </div>

      <div className="mb-8 rounded-lg border p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {manga.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Description</dt>
              <dd className="mt-1">{manga.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-muted-foreground">Alternative Titles</dt>
            <dd className="mt-1">
              {manga.alternativeTitles?.length
                ? manga.alternativeTitles.join(', ')
                : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Cover Path</dt>
            <dd className="mt-1 font-mono text-sm">{manga.coverPath || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Authors</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {manga.authors.map((a) => (
                <Badge key={a.id} variant="secondary">
                  {a.name}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Genres</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {manga.genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-1">{formatDateTime(manga.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="mt-1">{formatDateTime(manga.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Chapters</h2>

      {manga.chapters.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Chapters Yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() =>
                navigate({ to: '/admin/mangas/$id/edit', params: { id } })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Chapter
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {manga.chapters.map((chapter) => (
              <ChapterRow key={chapter.id} chapter={chapter} mangaId={id} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function ChapterRow({
  chapter,
  mangaId,
}: {
  chapter: ChapterDetail
  mangaId: string
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <TableRow>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell className="font-mono">{chapter.number}</TableCell>
          <TableCell>{chapter.title || '-'}</TableCell>
          <TableCell>{chapter.releaseDate || '-'}</TableCell>
          <TableCell className="max-w-50 truncate font-mono text-sm">
            {chapter.note || '-'}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  navigate({
                    to: '/admin/mangas/$id/edit',
                    params: { id: mangaId },
                  })
                }
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={6} className="bg-muted/30 p-0">
              {chapter.translations.length === 0 ? (
                <div className="px-6 py-3 text-sm text-muted-foreground">
                  No translations for this chapter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-10">Language</TableHead>
                      <TableHead>Translator</TableHead>
                      <TableHead>Folder Path</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapter.translations.map((tr) => (
                      <TableRow key={tr.id}>
                        <TableCell className="pl-10">
                          {tr.language.name}
                        </TableCell>
                        <TableCell>{tr.translator.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {tr.folderPath}
                        </TableCell>
                        <TableCell>{tr.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  )
}
