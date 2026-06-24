import { useEffect, useRef, useState } from 'react'
import { useLanguageList } from '#/hooks/useLanguages'
import { useBatchImport } from '#/hooks/useBatchImport'
import { TranslatorCombobox } from '#/components/translator/TranslatorCombobox'
import { parseChapterNumberFromFilename } from '#/utils/parseChapterNumber'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field as UiField, FieldLabel } from '#/components/ui/field'
import { FolderOpen, AlertTriangle } from 'lucide-react'

interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}

interface ParsedFile {
  file: File
  chapterNumber: number | null
}

export function BatchImportDialog({
  open,
  onOpenChange,
  mangaId,
}: BatchImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([])
  const [folderPicked, setFolderPicked] = useState(false)
  const [languageId, setLanguageId] = useState(0)
  const [translatorId, setTranslatorId] = useState(0)
  const { data: languages, isLoading: languagesLoading } = useLanguageList()
  const batchImport = useBatchImport(mangaId)

  useEffect(() => {
    if (!open) {
      setParsedFiles([])
      setFolderPicked(false)
      setLanguageId(0)
      setTranslatorId(0)
    }
  }, [open])

  const handleFolderSelected = () => {
    const files = inputRef.current?.files
    if (!files || files.length === 0) return

    setFolderPicked(true)
    const parsed: ParsedFile[] = []
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.zip')) continue
      const chapterNumber = parseChapterNumberFromFilename(file.name)
      parsed.push({ file, chapterNumber })
    }
    setParsedFiles(parsed)
  }

  const handleBrowse = () => {
    inputRef.current?.click()
  }

  const canSubmit = parsedFiles.length > 0 && languageId > 0 && translatorId > 0

  const handleSubmit = () => {
    const files = parsedFiles.map((p) => p.file)
    batchImport.mutate(files, { languageId, translatorId })
    onOpenChange(false)
  }

  const hasNoZipFiles = parsedFiles.length === 0 && folderPicked

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Import Chapters</DialogTitle>
          <DialogDescription>
            Import multiple chapters at once by selecting a folder of .zip
            files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <input
              ref={inputRef}
              type="file"
              webkitdirectory=""
              multiple
              accept=".zip"
              onChange={handleFolderSelected}
              data-testid="folder-input"
              className="hidden"
            />
            {parsedFiles.length === 0 && !hasNoZipFiles && (
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-muted-foreground/50"
                onClick={handleBrowse}
              >
                <FolderOpen className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a folder containing .zip chapter files
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBrowse()
                  }}
                >
                  Browse
                </Button>
              </div>
            )}

            {hasNoZipFiles && (
              <p role="alert" className="text-sm font-normal text-destructive">
                No .zip files found in folder
              </p>
            )}
          </div>

          {parsedFiles.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                {parsedFiles.length} .zip files selected
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {parsedFiles.map((pf, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                      {pf.chapterNumber !== null ? pf.chapterNumber : '?'}
                    </span>
                    <span className="truncate">{pf.file.name}</span>
                    {pf.chapterNumber === null && (
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr />

          <UiField>
            <FieldLabel htmlFor="batch-language" required>
              Language
            </FieldLabel>
            <Select
              value={String(languageId || '')}
              onValueChange={(v) => setLanguageId(Number(v))}
            >
              <SelectTrigger id="batch-language" aria-label="Language">
                <SelectValue
                  placeholder={
                    languagesLoading ? 'Loading...' : 'Select language'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {languages?.map((lang) => (
                  <SelectItem key={lang.id} value={String(lang.id)}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </UiField>

          <UiField>
            <FieldLabel htmlFor="batch-translator" required>
              Translator
            </FieldLabel>
            <TranslatorCombobox
              id="batch-translator"
              value={translatorId}
              onChange={setTranslatorId}
            />
          </UiField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Import{parsedFiles.length > 0 ? ` ${parsedFiles.length} files` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
