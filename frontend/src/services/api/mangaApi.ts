import axiosInstance from '#/services/api/api'

export interface MangaResponse {
  id: number
  title: string
  alternativeTitles: string[]
  description: string
  coverPath: string
  status: string
  authors: { id: number; name: string; createdAt: string; updatedAt: string }[]
  genres: { id: number; name: string; createdAt: string; updatedAt: string }[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type UpdateMangaPayload = Partial<CreateMangaPayload>

export interface CreateMangaPayload {
  title: string
  status: string
  description?: string
  alternativeTitles?: string[]
  coverPath?: string
  authors?: string[]
  genres?: string[]
}

export interface TranslationDetail {
  id: number
  url: string
  note?: string
  createdAt: string
  language: { id: number; code: string; name: string }
  translator: { id: number; name: string }
}

export interface ChapterDetail {
  id: number
  number: number
  title?: string
  releaseDate?: string
  note?: string
  translations: TranslationDetail[]
}

export interface MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetail[]
}

export interface ImportResult {
  total: number
  created: number
  errors: Array<{ row: number; message: string }>
}

export interface CreateChapterPayload {
  number: number
  title: string
  languageId: number
  translatorId: number
  url: string
}

export interface TranslationDetailResponse {
  id: number
  url: string
  note?: string
  createdAt: string
  language: { id: number; code: string; name: string }
  translator: { id: number; name: string }
  chapter: {
    id: number
    number: number
    title?: string
    manga: { id: number; title: string }
  }
  prevTranslationId: number | null
  nextTranslationId: number | null
}


export async function getAllMangas(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
}): Promise<PaginatedResponse<MangaResponse>> {
  const queryParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) queryParams.search = params.search
  if (params.status) queryParams.status = params.status
  if (params.authors) queryParams.authors = params.authors
  if (params.genres) queryParams.genres = params.genres

  const res = await axiosInstance.get<PaginatedResponse<MangaResponse>>(
    '/mangas',
    { params: queryParams },
  )
  return res.data
}

export async function createManga(
  data: CreateMangaPayload,
): Promise<MangaResponse> {
  const res = await axiosInstance.post<MangaResponse>(`/mangas`, data)

  return res.data
}

export async function getManga(
  id: number,
  include?: string,
): Promise<MangaResponse | MangaDetailResponse> {
  const params = include ? `?include=${include}` : ''
  const res = await axiosInstance.get<MangaResponse | MangaDetailResponse>(
    `/mangas/${id}${params}`,
  )
  return res.data
}

export async function updateManga(
  id: number,
  data: UpdateMangaPayload,
): Promise<MangaResponse> {
  const res = await axiosInstance.patch<MangaResponse>(`/mangas/${id}`, data)
  return res.data
}

export async function deleteManga(id: number): Promise<void> {
  await axiosInstance.delete(`/mangas/${id}`)
}

export async function getTemplateImport(): Promise<Blob> {
  const res = await axiosInstance.get('/mangas/import-template', {
    responseType: 'blob',
  })
  return res.data
}

export async function importMangas(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axiosInstance.post<ImportResult>(
    '/mangas/import',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return res.data
}

export async function createChapter(
  mangaId: number,
  data: CreateChapterPayload,
): Promise<void> {
  await axiosInstance.post(`/mangas/${mangaId}/chapter`, data)
}

export interface UpdateTranslationPayload {
  languageId?: number
  translatorId?: number
  url?: string
}

export interface ReaderChapterItem {
  chapterId: number
  number: number
  title: string | null
  translationId: number | null
  isFirstChapter: boolean
  isLatestChapter: boolean
}

export async function updateTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
  payload: UpdateTranslationPayload,
): Promise<void> {
  await axiosInstance.patch(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
    payload,
  )
}

export async function deleteTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
): Promise<void> {
  await axiosInstance.delete(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
  )
}

export async function getTranslation(
  id: number,
): Promise<TranslationDetailResponse> {
  const res = await axiosInstance.get<TranslationDetailResponse>(
    `/mangas/translations/${id}`,
  )
  return res.data
}

export async function getReaderChapters(
  mangaId: number,
  translatorId: number,
  language: string,
): Promise<ReaderChapterItem[]> {
  const res = await axiosInstance.get<ReaderChapterItem[]>('/mangas/reader/chapters', {
    params: { mangaId, translatorId, language },
  })
  return res.data
}
