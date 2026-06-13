import { useState, useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle } from 'lucide-react'
import { useImportMangas } from '#/hooks/useImportMangas'
import type { ImportResult } from '#/services/api/mangaApi'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mutation = useImportMangas()

  const reset = () => {
    setFile(null)
    setDragOver(false)
    mutation.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f?.name.endsWith('.xlsx')) setFile(f)
    e.target.value = ''
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files.item(0)
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) setFile(droppedFile)
  }

  const handleImport = () => {
    if (!file) return
    mutation.mutate(file)
  }

  const result: ImportResult | undefined = mutation.data
  const isPending = mutation.isPending
  const isError = mutation.isError
  const errorMessage = mutation.error?.message
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? ''
  const templateUrl = `${apiUrl}/mangas/import/template`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Mangas from Excel</DialogTitle>
          <DialogDescription>
            Select an .xlsx file to bulk import manga entries.
          </DialogDescription>
        </DialogHeader>

        <a
          href={templateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Download className="size-4" />
          Download template
        </a>

        {isError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Import failed: {errorMessage ?? 'Unknown error'}
          </div>
        )}

        {!result ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="size-8 text-muted-foreground" />
            {file ? (
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="size-5 text-green-600" />
                {file.name}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Drag and drop your .xlsx file here, or click to browse
                </p>
                <Button type="button" variant="outline" size="sm">
                  Browse Files
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="font-medium">
                {result.created} manga created successfully
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <XCircle className="size-4" />
                  Errors
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-muted-foreground">
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Processed {result.total} rows
            </p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={!file || isPending}
              >
                {isPending ? 'Importing...' : 'Import'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
