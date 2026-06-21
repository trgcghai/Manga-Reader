import axiosInstance from '#/services/api/api'

export interface GenreResponse {
  id: number
  name: string
  mangaCount?: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedGenreResponse {
  data: GenreResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateGenrePayload {
  name: string
}

export interface UpdateGenrePayload {
  name?: string
}

export async function getGenres(
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<PaginatedGenreResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (search) params.search = search

  const { data } = await axiosInstance.get<PaginatedGenreResponse>('/genres', {
    params,
  })
  return data
}

export async function getGenre(id: number): Promise<GenreResponse> {
  const { data } = await axiosInstance.get<GenreResponse>(`/genres/${id}`)
  return data
}

export async function createGenre(
  payload: CreateGenrePayload,
): Promise<GenreResponse> {
  const { data } = await axiosInstance.post<GenreResponse>('/genres', payload)
  return data
}

export async function updateGenre(
  id: number,
  payload: UpdateGenrePayload,
): Promise<GenreResponse> {
  const { data } = await axiosInstance.patch<GenreResponse>(
    `/genres/${id}`,
    payload,
  )
  return data
}

export async function deleteGenre(id: number): Promise<void> {
  await axiosInstance.delete(`/genres/${id}`)
}
