import {
  getTranslators,
  getTranslator,
  createTranslator,
  updateTranslator,
  deleteTranslator,
} from '#/services/api/translatorApi'
import type {
  TranslatorResponse,
  PaginatedTranslatorResponse,
  CreateTranslatorPayload,
  UpdateTranslatorPayload,
} from '#/services/api/translatorApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const translatorKeys = {
  all: ['translators'] as const,
  list: (page: number, limit: number, search?: string) =>
    [...translatorKeys.all, 'list', page, limit, search] as const,
  detail: (id: number) => [...translatorKeys.all, 'detail', id] as const,
}

export function useTranslatorList(
  page: number,
  limit: number,
  search?: string,
) {
  return useQuery<PaginatedTranslatorResponse>({
    queryKey: translatorKeys.list(page, limit, search),
    queryFn: () => getTranslators(page, limit, search),
  })
}

export function useCreateTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTranslatorPayload) => createTranslator(data),
    onSuccess: (translator) => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator "${translator.name}" created`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create translator',
      )
    },
  })
}

export function useTranslator(id: number) {
  return useQuery<TranslatorResponse>({
    queryKey: translatorKeys.detail(id),
    queryFn: () => getTranslator(id),
    enabled: !!id,
  })
}

export function useUpdateTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTranslatorPayload }) =>
      updateTranslator(id, data),
    onSuccess: (translator) => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator "${translator.name}" updated`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update translator',
      )
    },
  })
}

export function useDeleteTranslator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTranslator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translatorKeys.all })
      toast.success(`Translator deleted`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete translator',
      )
    },
  })
}
