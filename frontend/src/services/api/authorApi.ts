import axiosInstance from '#/services/api/api'

export interface AuthorResponse {
  id: number
  name: string
  mangaCount?: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedAuthorResponse {
  data: AuthorResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateAuthorPayload {
  name: string
}

export interface UpdateAuthorPayload {
  name?: string
}

export async function getAuthors(
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<PaginatedAuthorResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (search) params.search = search

  const { data } = await axiosInstance.get<PaginatedAuthorResponse>('/authors', { params })
  return data
}

export async function getAuthor(id: number): Promise<AuthorResponse> {
  const { data } = await axiosInstance.get<AuthorResponse>(`/authors/${id}`)
  return data
}

export async function createAuthor(
  payload: CreateAuthorPayload,
): Promise<AuthorResponse> {
  const { data } = await axiosInstance.post<AuthorResponse>('/authors', payload)
  return data
}

export async function updateAuthor(
  id: number,
  payload: UpdateAuthorPayload,
): Promise<AuthorResponse> {
  const { data } = await axiosInstance.patch<AuthorResponse>(
    `/authors/${id}`,
    payload,
  )
  return data
}

export async function deleteAuthor(id: number): Promise<void> {
  await axiosInstance.delete(`/authors/${id}`)
}
