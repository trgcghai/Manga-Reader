import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadTranslation } from '#/services/api/fileApi'
import { createChapter } from '#/services/api/mangaApi'

const TOAST_ID = 'batch-import'

interface ParsedFile {
  file: File
  chapterNumber: number | null
  title: string | null
}

interface Progress {
  total: number
  completed: number
  failed: number
}

interface ImportOptions {
  languageId: number
  translatorId: number
}

export function useBatchImport(mangaId: number) {
  const queryClient = useQueryClient()
  const isRunningRef = useRef(false)
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    completed: 0,
    failed: 0,
  })
  const [isRunning, setIsRunning] = useState(false)

  const mutate = useCallback(
    async (files: ParsedFile[], importOptions: ImportOptions) => {
      if (isRunningRef.current) return

      if (files.length === 0) {
        toast.error('No files to import')
        return
      }

      isRunningRef.current = true
      setIsRunning(true)
      const total = files.length
      setProgress({ total, completed: 0, failed: 0 })

      toast.loading(`0 / ${total} chapters imported...`, { id: TOAST_ID })

      let completed = 0
      let failed = 0

      for (const { file, chapterNumber, title } of files) {
        if (chapterNumber === null) {
          failed++
          setProgress({ total, completed, failed })
          toast.warning(
            `Skipped "${file.name}" — could not determine chapter number`,
            { id: TOAST_ID },
          )
          continue
        }

        try {
          const { url } = await uploadTranslation(file, mangaId, chapterNumber)
          await createChapter(mangaId, {
            number: chapterNumber,
            title: title ?? undefined,
            languageId: importOptions.languageId,
            translatorId: importOptions.translatorId,
            url,
          })
          completed++
        } catch {
          failed++
          toast.warning(`Failed to import "${file.name}"`, { id: TOAST_ID })
        }

        setProgress({ total, completed, failed })
        toast(`${completed} / ${total} chapters imported...`, { id: TOAST_ID })
      }

      isRunningRef.current = false
      setIsRunning(false)

      if (failed === 0) {
        toast.success(
          `Imported ${completed} / ${total} chapters successfully`,
          { id: TOAST_ID },
        )
      } else if (completed > 0) {
        toast.warning(
          `Imported ${completed} / ${total} chapters (${failed} failed)`,
          { id: TOAST_ID },
        )
      } else {
        toast.error(`0 / ${total} chapters imported (${failed} failed)`, {
          id: TOAST_ID,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
    },
    [mangaId, queryClient],
  )

  return { mutate, progress, isRunning }
}
