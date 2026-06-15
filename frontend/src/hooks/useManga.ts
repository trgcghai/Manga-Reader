import {
  createManga,
  getAllMangas,
  getManga,
  updateManga,
  deleteManga,
  importMangas,
  getTemplateImport,
  createChapter,
  updateTranslation,
  deleteTranslation,
} from '#/services/api/mangaApi'
import type {
  CreateMangaPayload,
  ImportResult,
  MangaResponse,
  MangaDetailResponse,
  PaginatedResponse,
  UpdateMangaPayload,
  CreateChapterPayload,
  UpdateTranslationPayload,
} from '#/services/api/mangaApi'
import { toast } from 'sonner'
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
    onSuccess: (manga) => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
      toast.success(`Manga "${manga.title}" created`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create manga')
    },
  })
}

export function useManga(id: number, options?: { include?: string }) {
  return useQuery<MangaResponse | MangaDetailResponse>({
    queryKey: options?.include
      ? [...mangaKeys.detail(id), options.include]
      : mangaKeys.detail(id),
    queryFn: () => getManga(id, options?.include),
    enabled: !!id,
  })
}

export function useUpdateManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMangaPayload }) =>
      updateManga(id, data),
    onSuccess: (manga) => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
      toast.success(`Manga "${manga.title}" updated`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update manga')
    },
  })
}

export function useDeleteManga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteManga(id),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
      toast.success(`Manga deleted`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete manga')
    },
  })
}

export function useGetTemplateImport() {
  return useQuery({
    queryKey: ['mangas', 'import-template'],
    queryFn: () => getTemplateImport(),
  })
}

export function useImportMangas() {
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => importMangas(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mangas'] })
      if (data.errors.length > 0) {
        toast.warning(
          `Imported ${data.created}/${data.total} mangas with ${data.errors.length} error${data.errors.length > 1 ? 's' : ''}`,
        )
      } else {
        toast.success(
          `${data.created} manga${data.created !== 1 ? 's' : ''} imported successfully`,
        )
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    },
  })
}

export function useCreateChapterForManga(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChapterPayload) => createChapter(mangaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Chapter created')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create chapter',
      )
    },
  })
}

export function useUpdateTranslation(mangaId: number, chapterId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      translationId,
      data,
    }: {
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

export function useDeleteTranslation(mangaId: number, chapterId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ translationId }: { translationId: number }) =>
      deleteTranslation(mangaId, chapterId, translationId),
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
