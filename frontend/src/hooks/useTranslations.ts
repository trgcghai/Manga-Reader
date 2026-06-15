import {
  updateTranslation,
  deleteTranslation,
} from '#/services/api/chapterApi'
import type { UpdateTranslationPayload } from '#/services/api/chapterApi'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateTranslation(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      chapterId,
      translationId,
      data,
    }: {
      chapterId: number
      translationId: number
      data: UpdateTranslationPayload
    }) => updateTranslation(mangaId, chapterId, translationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update translation',
      )
    },
  })
}

export function useDeleteTranslation(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      chapterId,
      translationId,
    }: {
      chapterId: number
      translationId: number
    }) => deleteTranslation(mangaId, chapterId, translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation deleted')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete translation',
      )
    },
  })
}
