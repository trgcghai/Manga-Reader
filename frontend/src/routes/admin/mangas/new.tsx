import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCreateManga } from '#/hooks/useManga'
import { useCoverUpload } from '#/hooks/useFile'
import type { CreateMangaPayload } from '#/services/api/mangaApi'
import { MangaForm } from '#/components/manga/MangaForm'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/admin/mangas/new')({
  component: CreateMangaPage,
})

function CreateMangaPage() {
  const navigate = useNavigate()
  const createMutation = useCreateManga()
  const uploadMutation = useCoverUpload()
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <MangaForm
      heading="Add Manga"
      defaultValues={{
        title: '',
        status: 'ongoing',
        description: '',
        alternativeTitles: [],
        coverPath: '',
        coverFile: null,
        authors: [],
        genres: [],
      }}
      onSubmit={async (value, _) => {
        setFormError(null)
        let coverPath: string | undefined
        if (value.coverFile) {
          try {
            const { url } = await uploadMutation.mutateAsync(value.coverFile)
            coverPath = url
          } catch {
            setFormError('Failed to upload cover image')
            return
          }
        }
        const payload: CreateMangaPayload = {
          title: value.title,
          status: value.status,
          description: value.description || undefined,
          alternativeTitles:
            value.alternativeTitles.length > 0
              ? value.alternativeTitles
              : undefined,
          coverPath,
          authors: value.authors,
          genres: value.genres,
        }
        createMutation.mutate(payload, {
          onSuccess: () => navigate({ to: '/admin/mangas' }),
        })
      }}
      isPending={createMutation.isPending || uploadMutation.isPending}
      error={formError || createMutation.error?.message || null}
      submitLabel={
        uploadMutation.isPending
          ? 'Uploading...'
          : createMutation.isPending
            ? 'Saving...'
            : 'Create Manga'
      }
      submitIcon={<Plus className="size-4" />}
      cancelLabel="Reset"
      resetOnCancel
    />
  )
}
