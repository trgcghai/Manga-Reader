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
  getTranslation,
  getReaderChapters,
  updateMangaFlag,
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
  TranslationDetailResponse,
  ReaderChapterItem,
  ReadingFlag,
} from '#/services/api/mangaApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const mangaKeys = {
  all: ['mangas'] as const,
  list: (params: {
    page: number
    limit: number
    search?: string
    status?: string
    authors?: string
    genres?: string
  }) =>
    [
      ...mangaKeys.all,
      'list',
      params.page,
      params.limit,
      params.search,
      params.status,
      params.authors,
      params.genres,
    ] as const,
  detail: (id: number) => [...mangaKeys.all, 'detail', id] as const,
}

export function useMangaList(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
}) {
  return useQuery<PaginatedResponse<MangaResponse>>({
    queryKey: mangaKeys.list(params),
    queryFn: () => getAllMangas(params),
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

export function useUpdateMangaFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mangaId, flag }: { mangaId: number; flag: ReadingFlag | null }) =>
      updateMangaFlag(mangaId, flag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
    },
    onError: (err) => {
      console.error(
        err instanceof Error ? err.message : 'Failed to update reading flag',
      )
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

export function useReaderChapters(
  mangaId: number | undefined,
  translatorId: number | undefined,
  language: string | undefined,
) {
  return useQuery<ReaderChapterItem[]>({
    queryKey: ['manga', 'reader', 'chapters', mangaId, translatorId, language],
    queryFn: () => getReaderChapters(mangaId!, translatorId!, language!),
    enabled: !!mangaId && !!translatorId && !!language,
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

export function useTranslation(id: number) {
  return useQuery<TranslationDetailResponse>({
    queryKey: ['manga', 'translations', id],
    queryFn: () => getTranslation(id),
    enabled: !!id,
  })
}
