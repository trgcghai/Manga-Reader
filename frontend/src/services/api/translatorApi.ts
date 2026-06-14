import axiosInstance from '#/services/api/api'

export interface TranslatorResponse {
  id: number
  name: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTranslatorResponse {
  data: TranslatorResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTranslatorPayload {
  name: string
  note?: string
}

export interface UpdateTranslatorPayload {
  name?: string
  note?: string
}

export async function getTranslators(
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<PaginatedTranslatorResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (search) params.search = search

  const { data } = await axiosInstance.get<PaginatedTranslatorResponse>(
    '/translators',
    { params },
  )
  return data
}

export async function getTranslator(id: number): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.get<TranslatorResponse>(
    `/translators/${id}`,
  )
  return data
}

export async function createTranslator(
  payload: CreateTranslatorPayload,
): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.post<TranslatorResponse>(
    '/translators',
    payload,
  )
  return data
}

export async function updateTranslator(
  id: number,
  payload: UpdateTranslatorPayload,
): Promise<TranslatorResponse> {
  const { data } = await axiosInstance.patch<TranslatorResponse>(
    `/translators/${id}`,
    payload,
  )
  return data
}

export async function deleteTranslator(id: number): Promise<void> {
  await axiosInstance.delete(`/translators/${id}`)
}
