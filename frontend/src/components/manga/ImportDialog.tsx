import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { FileSpreadsheet, Download } from 'lucide-react'
import { useGetTemplateImport, useImportMangas } from '#/hooks/useManga'
import { FileDropzone } from '#/components/ui/file-dropzone'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const mutation = useImportMangas()
  const { data: templateBlob } = useGetTemplateImport()

  const reset = () => {
    setFile(null)
    mutation.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
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

        <FileDropzone
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          value={file}
          onFileSelect={(f) => setFile(f)}
          message="Drag and drop your .xlsx file here, or click to browse"
          hint=".xlsx"
          icon={<FileSpreadsheet className="size-8 text-green-600" />}
          selectedDisplay="icon"
        />

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
