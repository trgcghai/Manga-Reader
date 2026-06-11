import axiosInstance from '#/services/api/api'

export interface MangaResponse {
  id: number
  title: string
  alternativeTitles: string[]
  description: string
  coverPath: string
  status: string
  authors?: { id: number; name: string }[]
  genres?: { id: number; name: string }[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
}

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
