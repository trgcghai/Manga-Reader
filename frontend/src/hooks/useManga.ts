import {
  createManga,
  getAllMangas,
  getManga,
  updateManga,
  deleteManga,
} from '#/services/api/mangaApi'
import type {
  CreateMangaPayload,
  MangaResponse,
  PaginatedResponse,
  UpdateMangaPayload,
} from '#/services/api/mangaApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const mangaKeys = {
  all: ['mangas'] as const,
  list: (page: number, limit: number) =>
    [...mangaKeys.all, 'list', page, limit] as const,
  detail: (id: number) => [...mangaKeys.all, 'detail', id] as const,
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

export function useManga(id: number) {
  return useQuery<MangaResponse>({
    queryKey: mangaKeys.detail(id),
    queryFn: () => getManga(id),
    enabled: !!id,
  })
}

export function useUpdateManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMangaPayload }) =>
      updateManga(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
  })
}

export function useDeleteManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteManga(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
  })
}
