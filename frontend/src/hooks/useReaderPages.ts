import { useState, useEffect, useRef, useCallback } from 'react'
import { useFileDownload } from '#/hooks/useFile'
import { parseCbzPages, loadCbzAsObjectUrls, revokeObjectUrls } from '#/utils/cbzParser'
import { useReaderStore } from '#/stores/rootStore'

export function useReaderPages(url: string | undefined): {
  pages: string[]
  isLoading: boolean
  error: string | null
} {
  const [pages, setPages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync } = useFileDownload()
  const urlsRef = useRef<string[]>([])

  const cleanup = useCallback(() => {
    revokeObjectUrls(urlsRef.current)
    urlsRef.current = []
  }, [])

  useEffect(() => {
    if (!url) {
      cleanup()
      setPages([])
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      cleanup()
      setIsLoading(true)
      setError(null)

      try {
        const blob = await mutateAsync(url)
        const buffer = await blob.arrayBuffer()
        const imageBlobs = await parseCbzPages(buffer)
        const urls = loadCbzAsObjectUrls(imageBlobs)

        if (cancelled) {
          revokeObjectUrls(urls)
          return
        }

        urlsRef.current = urls
        setPages(urls)
        useReaderStore.getState().setTotalPages(imageBlobs.length)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load CBZ')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [url, mutateAsync, cleanup])

  return { pages, isLoading, error }
}
