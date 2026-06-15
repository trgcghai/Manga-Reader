import {
  getGenres,
  getGenre,
  createGenre,
  updateGenre,
  deleteGenre,
} from '#/services/api/genreApi'
import type {
  GenreResponse,
  PaginatedGenreResponse,
  CreateGenrePayload,
  UpdateGenrePayload,
} from '#/services/api/genreApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const genreKeys = {
  all: ['genres'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...genreKeys.all, 'list', page, limit, search] as const,
  detail: (id: number) => [...genreKeys.all, 'detail', id] as const,
}

export function useGenreList(page: number, limit: number, search?: string) {
  return useQuery<PaginatedGenreResponse>({
    queryKey: genreKeys.list(page, limit, search),
    queryFn: () => getGenres(page, limit, search),
  })
}

export function useCreateGenre() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGenrePayload) => createGenre(data),
    onSuccess: (genre) => {
      queryClient.invalidateQueries({ queryKey: genreKeys.all })
      toast.success(`Genre "${genre.name}" created`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create genre')
    },
  })
}

export function useGenre(id: number) {
  return useQuery<GenreResponse>({
    queryKey: genreKeys.detail(id),
    queryFn: () => getGenre(id),
    enabled: !!id,
  })
}

export function useUpdateGenre() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGenrePayload }) =>
      updateGenre(id, data),
    onSuccess: (genre) => {
      queryClient.invalidateQueries({ queryKey: genreKeys.all })
      toast.success(`Genre "${genre.name}" updated`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update genre')
    },
  })
}

export function useDeleteGenre() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteGenre(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: genreKeys.all })
      toast.success(`Genre deleted`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete genre')
    },
  })
}
