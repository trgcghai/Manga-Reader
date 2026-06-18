/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useManga, useUpdateManga } from '#/hooks/useManga'
import { useFileUpload } from '#/hooks/useFile'
import type { UpdateMangaPayload } from '#/services/api/mangaApi'
import { MangaForm } from '#/components/manga/MangaForm'
import { Save } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'

export const Route = createFileRoute('/admin/mangas/$id/edit')({
  component: EditMangaPage,
})

function EditMangaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: manga, isLoading, isError } = useManga(Number(id))
  const updateMutation = useUpdateManga()
  const uploadMutation = useFileUpload()
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Edit Manga</h1>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !manga) {
    return (
      <ErrorDisplay className="mt-6">
        <ErrorTitle>Failed to Load Manga</ErrorTitle>
        <ErrorDescription>
          It may not exist or the backend is unavailable.
        </ErrorDescription>
      </ErrorDisplay>
    )
  }

  return (
    <MangaForm
      heading="Edit Manga"
      defaultValues={{
        title: manga.title,
        status: manga.status,
        description: manga.description ?? '',
        alternativeTitles: manga.alternativeTitles ?? [],
        coverPath: manga.coverPath ?? '',
        coverFile: null,
        authors: manga.authors.map((a) => a.name),
        genres: manga.genres.map((g) => g.name),
      }}
      onSubmit={async (value, coverRemoved) => {
        setFormError(null)
        let coverPath: string | undefined
        if (value.coverFile) {
          setUploading(true)
          try {
            const { url } = await uploadMutation.mutateAsync(value.coverFile)
            coverPath = url
          } catch {
            setFormError('Failed to upload cover image')
            return
          } finally {
            setUploading(false)
          }
        } else if (coverRemoved) {
          coverPath = ''
        }
        const payload: UpdateMangaPayload = {}
        if (value.title !== manga.title) payload.title = value.title
        if (value.status !== manga.status) payload.status = value.status
        if (value.description !== (manga.description ?? '')) {
          payload.description = value.description || undefined
        }
        if (coverPath !== undefined) payload.coverPath = coverPath
        if (
          JSON.stringify(value.alternativeTitles) !==
          JSON.stringify(manga.alternativeTitles)
        ) {
          payload.alternativeTitles =
            value.alternativeTitles.length > 0
              ? value.alternativeTitles
              : undefined
        }
        if (
          JSON.stringify(value.authors) !==
          JSON.stringify(manga.authors.map((a) => a.name))
        ) {
          payload.authors = value.authors
        }
        if (
          JSON.stringify(value.genres) !==
          JSON.stringify(manga.genres.map((g) => g.name))
        ) {
          payload.genres = value.genres
        }
        updateMutation.mutate(
          { id: Number(id), data: payload },
          { onSuccess: () => navigate({ to: '/admin/mangas' }) },
        )
      }}
      isPending={updateMutation.isPending || uploading}
      error={formError || updateMutation.error?.message || null}
      submitLabel={uploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      submitIcon={<Save className="size-4" />}
      cancelLabel="Cancel"
      cancelAction={() => navigate({ to: '/admin/mangas' })}
    />
  )
}
