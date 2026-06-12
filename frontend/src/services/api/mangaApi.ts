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

export async function getAllMangas(
  page: number,
  limit: number,
): Promise<PaginatedResponse<MangaResponse>> {
  const res = await axiosInstance.get<PaginatedResponse<MangaResponse>>(
    '/mangas',
    {
      params: { page, limit },
    },
  )

  return res.data
}

export async function createManga(
  data: CreateMangaPayload,
): Promise<MangaResponse> {
  const res = await axiosInstance.post<MangaResponse>(`/mangas`, data)

  return res.data
}

export async function getManga(id: number): Promise<MangaResponse> {
  const res = await axiosInstance.get<MangaResponse>(`/mangas/${id}`)
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
