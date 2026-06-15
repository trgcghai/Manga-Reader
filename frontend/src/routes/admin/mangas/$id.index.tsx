import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import type {
  MangaDetailResponse,
  ChapterDetail,
} from '#/services/api/mangaApi'
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
  EmptyContent,
} from '#/components/ui/empty'
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
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Pencil,
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'
import { formatDateTime } from '#/lib/dateTimeFormatter'
import AddChapterDialog from '#/components/chapter/AddChapterDialog'
import AddTranslationDialog from '#/components/chapter/AddTranslationDialog'
import EditTranslationDialog from '#/components/chapter/EditTranslationDialog'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
import { useDeleteTranslation, useManga } from '#/hooks/useManga'
import { getStatusVariant } from '#/lib/mangaUtils'

export const Route = createFileRoute('/admin/mangas/$id/')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/admin/mangas/$id/' })
  const navigate = useNavigate()
  const mangaId = Number(id)
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const { data, isLoading, isError } = useManga(mangaId, {
    include: 'chapters,translations',
  })
  const manga = data as MangaDetailResponse | undefined

  const variant = getStatusVariant(manga?.status)

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
          <Badge variant={variant} className="capitalize">
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
            <dt className="text-sm text-muted-foreground">
              Alternative Titles
            </dt>
            <dd className="mt-1">
              {manga.alternativeTitles.length
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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chapters</h2>
        <Button onClick={() => setChapterDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      {manga.chapters.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Chapters Yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setChapterDialogOpen(true)}>
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
              <TableHead className="w-10">#</TableHead>
              <TableHead>Title</TableHead>
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

      <AddChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        mangaId={mangaId}
      />
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
  const [translationDialogOpen, setTranslationDialogOpen] = useState(false)
  const [editDialogId, setEditDialogId] = useState<number | null>(null)
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null)
  const deleteMutation = useDeleteTranslation(Number(mangaId), chapter.id)

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
          <TableCell>{chapter.title}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTranslationDialogOpen(true)}
                title="Add translation"
              >
                <Plus className="h-3 w-3" />
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
                  <TableBody>
                    {chapter.translations.map((tr) => (
                      <React.Fragment key={tr.id}>
                        <TableRow className="text-muted-foreground">
                          <TableCell className="pl-10 w-1/10">
                            {tr.language.name}
                          </TableCell>
                          <TableCell className="w-1/5 truncate">
                            {tr.translator.name}
                          </TableCell>
                          <TableCell className="w-1/5">
                            {formatDateTime(tr.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm w-1/2 truncate">
                            {tr.folderPath}
                          </TableCell>
                          <TableCell className="w-20">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditDialogId(tr.id)}
                                title="Edit translation"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialogId(tr.id)}
                                title="Delete translation"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        <EditTranslationDialog
                          open={editDialogId === tr.id}
                          onOpenChange={(o) =>
                            setEditDialogId(o ? tr.id : null)
                          }
                          mangaId={Number(mangaId)}
                          chapterId={chapter.id}
                          translation={tr}
                        />

                        <DeleteConfirmDialog
                          open={deleteDialogId === tr.id}
                          onOpenChange={(o) =>
                            setDeleteDialogId(o ? tr.id : null)
                          }
                          title="Delete Translation"
                          entityName={`${tr.language.name} by ${tr.translator.name}`}
                          onConfirm={() => {
                            deleteMutation.mutate(
                              { translationId: tr.id },
                              {
                                onSuccess: () => setDeleteDialogId(null),
                              },
                            )
                          }}
                          isPending={deleteMutation.isPending}
                        />
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableCell>
          </TableRow>
        </CollapsibleContent>

        <AddTranslationDialog
          open={translationDialogOpen}
          onOpenChange={setTranslationDialogOpen}
          mangaId={Number(mangaId)}
          chapterNumber={String(chapter.number)}
          chapterTitle={chapter.title}
        />
      </>
    </Collapsible>
  )
}
