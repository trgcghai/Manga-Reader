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
  manga?: {
    id: number
    title: string
  }
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

export interface TrackingSourceListParams {
  mangaId?: number
  page?: number
  limit?: number
  search?: string
}

export async function getTrackingSources(
  params: TrackingSourceListParams = {},
): Promise<PaginatedTrackingSourceResponse> {
  const queryParams: Record<string, string | number> = {}
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  queryParams.page = page
  queryParams.limit = limit
  if (params.mangaId !== undefined) queryParams.mangaId = params.mangaId
  if (params.search) queryParams.search = params.search

  const { data } = await axiosInstance.get<PaginatedTrackingSourceResponse>(
    '/tracking-sources',
    { params: queryParams },
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

export interface CheckSourceResponse {
  updated: boolean
  previous?: string
  current?: string
  mangaId?: number
}

export interface CheckResult {
  sourceId: number
  sourceName: string
  url: string
  updated: boolean
  previous?: string
  current?: string
  error?: string
}

export async function checkTrackingSource(
  id: number,
): Promise<CheckSourceResponse> {
  const { data } = await axiosInstance.post<CheckSourceResponse>(
    `/tracking-sources/${id}/check`,
  )
  return data
}

export async function checkMangaSources(
  mangaId: number,
): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>(
    `/tracking-sources/check-manga/${mangaId}`,
  )
  return data
}

export async function checkAllSources(): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>(
    '/tracking-sources/check-all',
  )
  return data
}
