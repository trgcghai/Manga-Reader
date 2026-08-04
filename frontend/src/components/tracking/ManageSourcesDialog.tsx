import { useState } from 'react'
import { Pencil, Plus, Radar, Trash2 } from 'lucide-react'
import {
  useCreateTrackingSource,
  useDeleteTrackingSource,
  useTrackingSources,
  useUpdateTrackingSource,
} from '#/hooks/useTracking'
import type { TrackingSourceResponse } from '#/services/api/trackingApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  ErrorAction,
  ErrorDescription,
  ErrorDisplay,
  ErrorTitle,
} from '#/components/ui/error-display'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
import { SourceForm } from './SourceForm'
import type { SourceFormValues } from './SourceForm'
import { truncate } from 'lodash'

interface ManageSourcesDialogProps {
  mangaId: number
  mangaTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageSourcesDialog({
  mangaId,
  mangaTitle,
  open,
  onOpenChange,
}: ManageSourcesDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSource, setEditingSource] =
    useState<TrackingSourceResponse | null>(null)
  const [deleteSource, setDeleteSource] =
    useState<TrackingSourceResponse | null>(null)

  const { data, isLoading, isError, refetch } = useTrackingSources({
    mangaId,
    page: 1,
    limit: 100,
  })
  const createMutation = useCreateTrackingSource()
  const updateMutation = useUpdateTrackingSource()
  const deleteMutation = useDeleteTrackingSource()

  const handleAdd = (values: SourceFormValues) => {
    createMutation.mutate(
      { mangaId, name: values.name.trim(), url: values.url.trim() },
      { onSuccess: () => setShowAddForm(false) },
    )
  }

  const handleUpdate = (values: SourceFormValues) => {
    if (!editingSource) return
    updateMutation.mutate(
      {
        id: editingSource.id,
        data: { name: values.name.trim(), url: values.url.trim() },
      },
      { onSuccess: () => setEditingSource(null) },
    )
  }

  const showForm = showAddForm || editingSource !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl!">
        <DialogHeader>
          <DialogTitle>Manage Sources — {mangaTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSource(null)
              setShowAddForm(true)
            }}
          >
            <Plus className="size-4" />
            Add Source
          </Button>
        </div>

        {showForm && (
          <SourceForm
            key={editingSource?.id ?? 'add'}
            initialValues={{
              name: editingSource?.name ?? '',
              url: editingSource?.url ?? '',
            }}
            submitLabel={editingSource ? 'Save' : 'Add'}
            isPending={
              editingSource
                ? updateMutation.isPending
                : createMutation.isPending
            }
            onSubmit={editingSource ? handleUpdate : handleAdd}
            onCancel={() => {
              setShowAddForm(false)
              setEditingSource(null)
            }}
          />
        )}

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorDisplay>
            <ErrorTitle>Failed to Load Tracking Sources</ErrorTitle>
            <ErrorDescription>
              Make sure the backend is running.
            </ErrorDescription>
            <ErrorAction>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </ErrorAction>
          </ErrorDisplay>
        )}

        {data && data.data.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Radar />
              </EmptyMedia>
              <EmptyTitle>No Sources Configured</EmptyTitle>
              <EmptyDescription>
                No sources configured for this manga.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {data && data.data.length > 0 && (
          <div className="flex flex-col">
            {data.data.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{source.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {truncate(source.url, { length: 70 })}
                  </p>
                  {source.extractorPath && (
                    <p className="text-sm text-muted-foreground">
                      Path: {source.extractorPath}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {source.latestChapterNumber ?? 'Not checked yet'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    size="icon-sm"
                    aria-label={`Edit ${source.name}`}
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingSource(source)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    size="icon-sm"
                    aria-label={`Delete ${source.name}`}
                    onClick={() => setDeleteSource(source)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DeleteConfirmDialog
          open={!!deleteSource}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDeleteSource(null)
          }}
          title="Delete Source"
          entityName={deleteSource?.name ?? ''}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            if (!deleteSource) return
            deleteMutation.mutate(deleteSource.id, {
              onSuccess: () => setDeleteSource(null),
            })
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
