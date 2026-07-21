import { useEffect, useRef, useState } from 'react'
import { useLanguageList } from '#/hooks/useLanguages'
import { useBatchImport } from '#/hooks/useBatchImport'
import { TranslatorCombobox } from '#/components/translator/TranslatorCombobox'
import { parseChapterInfoFromFilename } from '#/utils/parseChapterInfo'
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '#/components/ui/table'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Field as UiField, FieldLabel } from '#/components/ui/field'
import { FolderOpen, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { TRANSLATION_EXTENSIONS } from '#/constants/file'

interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}

interface ParsedFile {
  file: File
  chapterNumber: number | null
  title: string | null
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
      const isZip = TRANSLATION_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(`.${ext}`),
      )
      if (!isZip) continue
      const info = parseChapterInfoFromFilename(file.name)
      parsed.push({ file, chapterNumber: info.chapterNumber, title: info.title })
    }
    setParsedFiles(parsed)
  }

  const handleBrowse = () => {
    inputRef.current?.click()
  }

  const canSubmit =
    parsedFiles.length > 0 && languageId > 0 && translatorId > 0 && !batchImport.isRunning

  const handleSubmit = () => {
    if (batchImport.isRunning) return
    batchImport.mutate(parsedFiles, { languageId, translatorId })
    onOpenChange(false)
  }

  const hasNoZipFiles = parsedFiles.length === 0 && folderPicked

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl!'>
        <DialogHeader>
          <DialogTitle>Batch Import Chapters</DialogTitle>
          <DialogDescription>
            Import multiple chapters at once by selecting a folder of .zip
            files named{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
              chapterXX.zip
            </code>{' '}
            (e.g. <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">chapter12.zip</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-4">
          <div>
            <input
              ref={inputRef}
              type="file"
              webkitdirectory=""
              multiple
              accept={`.${TRANSLATION_EXTENSIONS.join(',.')}`}
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
              <ScrollArea className="h-64 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-muted-foreground font-semibold w-8">#</TableHead>
                      <TableHead className="text-muted-foreground font-semibold w-20">Chapter</TableHead>
                      <TableHead className="text-muted-foreground font-semibold w-32">File Name</TableHead>
                      <TableHead className="text-muted-foreground font-semibold w-24">Title</TableHead>
                      <TableHead className="text-muted-foreground font-semibold w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedFiles.map((pf, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          {pf.chapterNumber !== null ? (
                            <span className="font-mono">{pf.chapterNumber}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="max-w-0 truncate"
                          title={pf.file.name}
                        >
                          {pf.file.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pf.title ?? '-'}
                        </TableCell>
                        <TableCell>
                          {pf.chapterNumber !== null ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="size-3.5" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle className="size-3.5" />
                              Unparseable
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

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
