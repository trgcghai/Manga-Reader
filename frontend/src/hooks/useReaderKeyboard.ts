import { useEffect } from 'react'

interface UseReaderKeyboardOptions {
  onNextPage: () => void
  onPrevPage: () => void
  enabled: boolean
  readingMode: 'page' | 'scroll'
}

export function useReaderKeyboard({
  onNextPage,
  onPrevPage,
  enabled,
  readingMode,
}: UseReaderKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onPrevPage()
          break
        case 'ArrowRight':
          e.preventDefault()
          onNextPage()
          break
        case ' ':
          if (readingMode === 'scroll') break
          e.preventDefault()
          onNextPage()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNextPage, onPrevPage, enabled, readingMode])
}
