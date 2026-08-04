import {
  getTrackingSources,
  createTrackingSource,
  updateTrackingSource,
  deleteTrackingSource,
  getTrackingConfig,
  updateTrackingConfig,
} from '#/services/api/trackingApi'
import type {
  PaginatedTrackingSourceResponse,
  TrackingSourceListParams,
  CreateTrackingSourcePayload,
  UpdateTrackingSourcePayload,
  TrackingConfigResponse,
  UpdateTrackingConfigPayload,
} from '#/services/api/trackingApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const trackingKeys = {
  all: ['tracking'] as const,
  sourceList: (params: TrackingSourceListParams = {}) =>
    [
      ...trackingKeys.all,
      'sources',
      params.mangaId,
      params.page,
      params.limit,
      params.search,
    ] as const,
  config: () => [...trackingKeys.all, 'config'] as const,
}

export function useTrackingSources(params: TrackingSourceListParams = {}) {
  return useQuery<PaginatedTrackingSourceResponse>({
    queryKey: trackingKeys.sourceList(params),
    queryFn: () => getTrackingSources(params),
  })
}

export function useCreateTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTrackingSourcePayload) =>
      createTrackingSource(data),
    onSuccess: (source) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success(`Source "${source.name}" created`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create source',
      )
    },
  })
}

export function useUpdateTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateTrackingSourcePayload
    }) => updateTrackingSource(id, data),
    onSuccess: (source) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success(`Source "${source.name}" updated`)
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update source',
      )
    },
  })
}

export function useDeleteTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTrackingSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success('Source deleted')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete source',
      )
    },
  })
}

export function useTrackingConfig() {
  return useQuery<TrackingConfigResponse>({
    queryKey: trackingKeys.config(),
    queryFn: () => getTrackingConfig(),
  })
}

export function useUpdateTrackingConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTrackingConfigPayload) =>
      updateTrackingConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success('Tracking config updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update tracking config',
      )
    },
  })
}
