import { useEffect, useRef, useState } from 'react'
import {
  useTrackingConfig,
  useTrackingSources,
  useUpdateTrackingConfig,
} from '#/hooks/useTracking'
import { useDebounce } from '#/hooks/useDebounce'
import type { UpdateTrackingConfigPayload } from '#/services/api/trackingApi'
import { Button } from '#/components/ui/button'
import { Plus } from 'lucide-react'
import { TrackingConfigPanel } from './TrackingConfigPanel'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import { ManageSourcesDialog } from './ManageSourcesDialog'
import { CreateTrackingSourceDialog } from './CreateTrackingSourceDialog'

export function TrackingPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [manageSource, setManageSource] = useState<{
    mangaId: number
    mangaTitle: string
  } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)

  const { data: config, isLoading: configLoading } = useTrackingConfig()
  const {
    data: sources,
    isLoading,
    isError,
    refetch,
  } = useTrackingSources({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
  })
  const updateConfigMutation = useUpdateTrackingConfig()

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [search])

  const handleSaveConfig = (payload: UpdateTrackingConfigPayload) => {
    updateConfigMutation.mutate(payload)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tracking sources and schedule automatic chapter checks.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
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
        search={searchInput}
        onSearchChange={setSearchInput}
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

      {createOpen && (
        <CreateTrackingSourceDialog
          open
          onOpenChange={(open) => {
            if (!open) setCreateOpen(false)
          }}
        />
      )}
    </div>
  )
}
