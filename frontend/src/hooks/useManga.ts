import { createManga, getAllMangas } from '#/services/api/mangaApi'
import type {
  CreateMangaPayload,
  MangaResponse,
  PaginatedResponse,
} from '#/services/api/mangaApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const mangaKeys = {
  all: ['mangas'] as const,
  list: (page: number, limit: number) =>
    [...mangaKeys.all, 'list', page, limit] as const,
}

export function useMangaList(page: number, limit: number) {
  return useQuery<PaginatedResponse<MangaResponse>>({
    queryKey: mangaKeys.list(page, limit),
    queryFn: () => getAllMangas(page, limit),
  })
}

export function useCreateManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMangaPayload) => createManga(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
  })
}
