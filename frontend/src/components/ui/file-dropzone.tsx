import { type ReactNode } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

interface FileDropzoneProps {
  accept: Record<string, string[]>
  onFileSelect: (file: File | null) => void
  value: File | null
  error?: string
  disabled?: boolean
  className?: string
  icon?: ReactNode
  message?: string
  hint?: string
  selectedDisplay?: 'badge' | 'icon' | 'none'
  previewUrl?: string
  onRemove?: () => void
  aspectRatio?: string
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: ReactNode
  message: string
  hint?: string
}) {
  return (
    <>
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
      <Button type="button" variant="outline" size="sm">
        Browse Files
      </Button>
    </>
  )
}

function SelectedFileBadge({ filename }: { filename: string }) {
  return <Badge className="text-sm font-medium">{filename}</Badge>
}

function SelectedFileIcon({ icon, filename }: { icon: ReactNode; filename: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {icon}
      <span>{filename}</span>
    </div>
  )
}

function PreviewOverlay({
  previewUrl,
  aspectRatio,
  onRemove,
}: {
  previewUrl: string
  aspectRatio?: string
  onRemove?: () => void
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-muted', aspectRatio ?? '')}>
      <img
        src={previewUrl}
        alt="Preview"
        className="size-full object-cover"
      />
      {onRemove && (
        <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}

export function FileDropzone({
  accept,
  onFileSelect,
  value,
  error,
  disabled = false,
  className,
  icon = <Upload className="size-8 text-muted-foreground" />,
  message = 'Drag and drop your file here, or click to browse',
  hint,
  selectedDisplay = 'badge',
  previewUrl,
  onRemove,
  aspectRatio,
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) onFileSelect(acceptedFiles[0])
    },
    accept,
    disabled,
    multiple: false,
  })

  const showPreview = previewUrl !== undefined && previewUrl !== null
  const hasValue = value !== null && value !== undefined

  return (
    <div className={cn('space-y-3', className)}>
      {showPreview ? (
        <PreviewOverlay previewUrl={previewUrl} aspectRatio={aspectRatio} onRemove={onRemove} />
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            disabled && 'pointer-events-none opacity-50',
            error && 'border-destructive',
          )}
          aria-invalid={!!error || undefined}
        >
          <input {...getInputProps()} />
          {hasValue && selectedDisplay === 'badge' && (
            <SelectedFileBadge filename={value.name} />
          )}
          {hasValue && selectedDisplay === 'icon' && (
            <SelectedFileIcon icon={icon} filename={value.name} />
          )}
          {!hasValue && (
            <EmptyState icon={icon} message={message} hint={hint} />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-normal text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
