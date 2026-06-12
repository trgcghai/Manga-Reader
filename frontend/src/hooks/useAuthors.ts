import {
  getAuthors,
  getAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from '#/services/api/authorApi'
import type {
  AuthorResponse,
  PaginatedAuthorResponse,
  CreateAuthorPayload,
  UpdateAuthorPayload,
} from '#/services/api/authorApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const authorKeys = {
  all: ['authors'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...authorKeys.all, 'list', page, limit, search] as const,
  detail: (id: number) => [...authorKeys.all, 'detail', id] as const,
}

export function useAuthorList(page: number, limit: number, search?: string) {
  return useQuery<PaginatedAuthorResponse>({
    queryKey: authorKeys.list(page, limit, search),
    queryFn: () => getAuthors(page, limit, search),
  })
}

export function useCreateAuthor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAuthorPayload) => createAuthor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all })
    },
  })
}

export function useAuthor(id: number) {
  return useQuery<AuthorResponse>({
    queryKey: authorKeys.detail(id),
    queryFn: () => getAuthor(id),
    enabled: !!id,
  })
}

export function useUpdateAuthor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAuthorPayload }) =>
      updateAuthor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all })
    },
  })
}

export function useDeleteAuthor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAuthor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all })
    },
  })
}
