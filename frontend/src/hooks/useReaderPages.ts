import { useState, useEffect, useRef, useCallback } from 'react'
import { useFileDownload } from '#/hooks/useFile'
import { useReaderStore } from '#/stores/rootStore'
import {
  loadPagesAsObjectUrls,
  parsePages,
  revokeObjectUrls,
} from '#/utils/fileParser'

export function useReaderPages(url: string | undefined): {
  pages: string[]
  isLoading: boolean
  error: Error | null
} {
  const [pages, setPages] = useState<string[]>([])
  const { mutateAsync, isPending, error } = useFileDownload({
    showErrorToast: false,
    showSuccessToast: false,
  })
  const urlsRef = useRef<string[]>([])

  const cleanup = useCallback(() => {
    revokeObjectUrls(urlsRef.current)
    urlsRef.current = []
  }, [])

  useEffect(() => {
    if (!url) {
      cleanup()
      setPages([])
      return
    }

    let cancelled = false

    async function load() {
      cleanup()

      try {
        if (!url) return
        const blob = await mutateAsync(url)
        const buffer = await blob.arrayBuffer()
        const imageBlobs = await parsePages(buffer)
        const urls = loadPagesAsObjectUrls(imageBlobs)

        if (cancelled) {
          revokeObjectUrls(urls)
          return
        }

        urlsRef.current = urls
        setPages(urls)
        useReaderStore.getState().setTotalPages(imageBlobs.length)
      } catch (e) {
        console.log('Failed in useReaderPages: ', e)
      }
    }

    load()

    return () => {
      cancelled = true
      cleanup()
      setPages([])
    }
  }, [url, mutateAsync, cleanup])

  return { pages, isLoading: isPending, error }
}
