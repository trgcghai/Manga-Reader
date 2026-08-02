import axiosInstance from '#/services/api/api'

export interface TrackingSourceResponse {
  id: number
  mangaId: number
  url: string
  name: string
  extractorPath?: string
  latestChapterNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTrackingSourceResponse {
  data: TrackingSourceResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTrackingSourcePayload {
  mangaId: number
  url: string
  name: string
  extractorPath?: string
}

export interface UpdateTrackingSourcePayload {
  url?: string
  name?: string
  extractorPath?: string
}

export type TrackingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface TrackingConfigResponse {
  id: number
  frequency: TrackingFrequency
  interval: number
  runAt: string
  updatedAt: string
}

export interface UpdateTrackingConfigPayload {
  frequency?: TrackingFrequency
  interval?: number
  runAt?: string
}

export async function getTrackingSources(
  mangaId?: number,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedTrackingSourceResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (mangaId !== undefined) params.mangaId = mangaId

  const { data } = await axiosInstance.get<PaginatedTrackingSourceResponse>(
    '/tracking-sources',
    { params },
  )
  return data
}

export async function createTrackingSource(
  payload: CreateTrackingSourcePayload,
): Promise<TrackingSourceResponse> {
  const { data } = await axiosInstance.post<TrackingSourceResponse>(
    '/tracking-sources',
    payload,
  )
  return data
}

export async function updateTrackingSource(
  id: number,
  payload: UpdateTrackingSourcePayload,
): Promise<TrackingSourceResponse> {
  const { data } = await axiosInstance.patch<TrackingSourceResponse>(
    `/tracking-sources/${id}`,
    payload,
  )
  return data
}

export async function deleteTrackingSource(id: number): Promise<void> {
  await axiosInstance.delete(`/tracking-sources/${id}`)
}

export async function getTrackingConfig(): Promise<TrackingConfigResponse> {
  const { data } = await axiosInstance.get<TrackingConfigResponse>(
    '/tracking-sources/config',
  )
  return data
}

export async function updateTrackingConfig(
  payload: UpdateTrackingConfigPayload,
): Promise<TrackingConfigResponse> {
  const { data } = await axiosInstance.patch<TrackingConfigResponse>(
    '/tracking-sources/config',
    payload,
  )
  return data
}
