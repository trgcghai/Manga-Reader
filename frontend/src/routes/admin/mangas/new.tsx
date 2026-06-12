import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCreateManga } from '#/hooks/useManga'
import type { CreateMangaPayload } from '#/services/api/mangaApi'
import { MangaForm } from '#/components/manga/MangaForm'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/admin/mangas/new')({
  component: CreateMangaPage,
})

function CreateMangaPage() {
  const navigate = useNavigate()
  const mutation = useCreateManga()

  return (
    <MangaForm
      heading="Add Manga"
      defaultValues={{
        title: '',
        status: 'ongoing',
        description: '',
        alternativeTitles: [],
        coverPath: '',
        authors: [],
        genres: [],
      }}
      onSubmit={(value) => {
        const payload: CreateMangaPayload = {
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
        mutation.mutate(payload, {
          onSuccess: () => navigate({ to: '/admin/mangas' }),
        })
      }}
      isPending={mutation.isPending}
      error={mutation.error?.message || null}
      submitLabel="Create Manga"
      submitIcon={<Plus className="size-4" />}
      cancelLabel="Reset"
      resetOnCancel
    />
  )
}
