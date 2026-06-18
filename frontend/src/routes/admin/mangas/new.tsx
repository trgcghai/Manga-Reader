import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCreateManga } from '#/hooks/useManga'
import { useFileUpload } from '#/hooks/useFile'
import type { CreateMangaPayload } from '#/services/api/mangaApi'
import { MangaForm } from '#/components/manga/MangaForm'
import { Plus } from 'lucide-react'

export const Route = createFileRoute('/admin/mangas/new')({
  component: CreateMangaPage,
})

function CreateMangaPage() {
  const navigate = useNavigate()
  const createMutation = useCreateManga()
  const uploadMutation = useFileUpload()
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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
      isPending={createMutation.isPending || uploading}
      error={formError || createMutation.error?.message || null}
      submitLabel={uploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : 'Create Manga'}
      submitIcon={<Plus className="size-4" />}
      cancelLabel="Reset"
      resetOnCancel
    />
  )
}
