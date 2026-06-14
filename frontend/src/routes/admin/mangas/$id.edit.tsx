/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useManga, useUpdateManga } from '#/hooks/useManga'
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
  const mutation = useUpdateManga()

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
        authors: manga.authors.map((a) => a.name),
        genres: manga.genres.map((g) => g.name),
      }}
      onSubmit={(value) => {
        const payload: UpdateMangaPayload = {
          title: value.title,
          status: value.status,
          description: value.description || undefined,
          alternativeTitles:
            value.alternativeTitles.length > 0
              ? value.alternativeTitles
              : undefined,
          coverPath: value.coverPath || undefined,
          authors: value.authors,
          genres: value.genres,
        }
        mutation.mutate(
          { id: Number(id), data: payload },
          { onSuccess: () => navigate({ to: '/admin/mangas' }) },
        )
      }}
      isPending={mutation.isPending}
      error={mutation.error?.message || null}
      submitLabel="Save Changes"
      submitIcon={<Save className="size-4" />}
      cancelLabel="Cancel"
      cancelAction={() => navigate({ to: '/admin/mangas' })}
    />
  )
}
