import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importMangas } from '#/services/api/mangaApi'
import type { ImportResult } from '#/services/api/mangaApi'

export function useImportMangas() {
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => importMangas(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas'] })
    },
  })
}
