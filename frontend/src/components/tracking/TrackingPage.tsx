import { useEffect, useState } from 'react'
import {
  useTrackingConfig,
  useTrackingSources,
  useUpdateTrackingConfig,
} from '#/hooks/useTracking'
import type { UpdateTrackingConfigPayload } from '#/services/api/trackingApi'
import { TrackingConfigPanel } from './TrackingConfigPanel'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import { ManageSourcesDialog } from './ManageSourcesDialog'

export function TrackingPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [manageSource, setManageSource] = useState<{
    mangaId: number
    mangaTitle: string
  } | null>(null)

  const { data: config, isLoading: configLoading } = useTrackingConfig()
  const {
    data: sources,
    isLoading,
    isError,
    refetch,
  } = useTrackingSources(undefined, page, pageSize)
  const updateConfigMutation = useUpdateTrackingConfig()

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const handleSaveConfig = (payload: UpdateTrackingConfigPayload) => {
    updateConfigMutation.mutate(payload)
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage tracking sources and schedule automatic chapter checks.
        </p>
      </div>

      <TrackingConfigPanel
        key={`${config?.id}-${config?.updatedAt}`}
        config={config}
        isLoading={configLoading}
        isSaving={updateConfigMutation.isPending}
        onSave={handleSaveConfig}
      />

      <TrackingSourcesTable
        data={sources}
        isLoading={isLoading}
        isError={isError}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRetry={() => refetch()}
        onManage={(source) =>
          setManageSource({
            mangaId: source.mangaId,
            mangaTitle: source.manga?.title ?? `Manga #${source.mangaId}`,
          })
        }
      />

      {manageSource && (
        <ManageSourcesDialog
          mangaId={manageSource.mangaId}
          mangaTitle={manageSource.mangaTitle}
          open
          onOpenChange={(open) => {
            if (!open) setManageSource(null)
          }}
        />
      )}
    </div>
  )
}
