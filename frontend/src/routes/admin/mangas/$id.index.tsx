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
  Download,
} from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'
import { formatDateTime } from '#/lib/dateTimeFormatter'
import AddChapterDialog from '#/components/chapter/AddChapterDialog'
import { BatchImportDialog } from '#/components/chapter/BatchImportDialog'
import AddTranslationDialog from '#/components/chapter/AddTranslationDialog'
import EditTranslationDialog from '#/components/chapter/EditTranslationDialog'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
import { useDeleteTranslation, useManga } from '#/hooks/useManga'
import { getStatusVariant } from '#/lib/mangaUtils'
import { useFileDownload } from '#/hooks/useFile'

export const Route = createFileRoute('/admin/mangas/$id/')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/admin/mangas/$id/' })
  const navigate = useNavigate()
  const mangaId = Number(id)
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
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
      <Button
        variant="link"
        size="sm"
        asChild
        className="mb-6 px-0 text-muted-foreground"
      >
        <Link to="/admin/mangas">
          <ArrowLeft className="mr-1 size-4" />
          All Mangas
        </Link>
      </Button>

      <div className="mb-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0 self-center sm:self-start">
          {manga.coverPath ? (
            <div className="relative aspect-3/4 w-60 overflow-hidden rounded-md border bg-muted shadow-sm">
              <img
                src={manga.coverPath}
                alt={`${manga.title} cover`}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-3/4 w-60 items-center justify-center rounded-md border bg-muted">
              <BookOpen className="size-14 text-muted-foreground/25" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {manga.title}
                </h1>
                <Badge variant={variant} className="capitalize">
                  {manga.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {manga.genres.map((g) => (
                  <Badge
                    key={g.id}
                    variant="secondary"
                    className="text-secondary-foreground"
                  >
                    {g.name}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() =>
                navigate({ to: '/admin/mangas/$id/edit', params: { id } })
              }
            >
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground capitalize tracking-wider">
              Description
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-secondary-foreground">
              {manga.description || 'No description provided.'}
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground capitalize tracking-wider">
                Authors
              </p>
              <div className="flex flex-wrap gap-1.5 text-secondary-foreground text-sm">
                {manga.authors.map((a) => a.name).join(', ')}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {manga.alternativeTitles.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground capitalize tracking-wider">
                  Also
                </p>
                <p className="flex flex-wrap gap-1.5 text-secondary-foreground text-sm">
                  {manga.alternativeTitles.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chapters</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBatchDialogOpen(true)}
          >
            Batch Import
          </Button>
          <Button onClick={() => setChapterDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Chapter
          </Button>
        </div>
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

      <BatchImportDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        mangaId={mangaId}
      />
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
  const downloadFile = useFileDownload()

  const handleDownload = async (url: string) => {
    try {
      const blob = await downloadFile.mutateAsync(url)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = url.split('/').pop() || 'translation_file'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('Error downloading translation file:', error)
    }
  }

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
                            {tr.url.split('/').pop()}
                          </TableCell>
                          <TableCell className="w-20">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(tr.url)}
                                disabled={downloadFile.isPending}
                                title="Download translation"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
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
                          chapterNumber={chapter.number}
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
