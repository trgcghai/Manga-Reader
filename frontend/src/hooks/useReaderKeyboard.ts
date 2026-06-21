import { useEffect } from 'react'

interface UseReaderKeyboardOptions {
  onNext: () => void
  onPrev: () => void
  enabled: boolean
  readingMode: 'page' | 'scroll'
}

export function useReaderKeyboard({
  onNext,
  onPrev,
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
          onPrev()
          break
        case 'ArrowRight':
          e.preventDefault()
          onNext()
          break
        case ' ':
          if (readingMode === 'scroll') break
          e.preventDefault()
          onNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNext, onPrev, enabled, readingMode])
}
