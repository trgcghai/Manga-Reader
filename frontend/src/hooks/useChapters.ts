// frontend/src/hooks/useChapters.ts
import { createChapter } from '#/services/api/chapterApi'
import type { CreateChapterPayload } from '#/services/api/chapterApi'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateChapter(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChapterPayload) => createChapter(mangaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Chapter created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create chapter')
    },
  })
}
