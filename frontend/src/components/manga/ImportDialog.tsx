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
import { Upload, FileSpreadsheet, Download } from 'lucide-react'
import { useGetTemplateImport, useImportMangas } from '#/hooks/useManga'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mutation = useImportMangas()
  const { data: templateBlob } = useGetTemplateImport()

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
    mutation.mutate(file, { onSettled: () => handleOpenChange(false) })
  }

  const handleDownloadTemplate = async () => {
    if (!templateBlob) return

    const url = URL.createObjectURL(templateBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'manga_import_template.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isPending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Mangas from Excel</DialogTitle>
          <DialogDescription>
            Select an .xlsx file to bulk import manga entries.
          </DialogDescription>
        </DialogHeader>

        <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
          <Download className="size-4" />
          Download template
        </Button>

        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
