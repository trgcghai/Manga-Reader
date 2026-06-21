import { useState, useEffect, useRef } from 'react'
import { useReaderStore } from '#/stores/rootStore'
import { PageIndicator } from './PageIndicator'
import { ScrollArea } from '#/components/ui/scroll-area'

interface ScrollViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  onPrevChapter: () => void
  onNextChapter: () => void
}

export function ScrollViewer({
  pages,
  displayMode,
}: ScrollViewerProps) {
  const [errored, setErrored] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const currentPage = useReaderStore((s) => s.currentPage)

  useEffect(() => {
    setErrored(new Set())
  }, [pages])

  function renderPage(index: number, fullWidth?: boolean) {
    if (errored.has(index)) {
      return (
        <div
          key={`placeholder-${index}`}
          className="flex items-center justify-center bg-zinc-800 text-zinc-400 max-h-screen max-w-full aspect-3/4"
        >
          Page {index + 1}
        </div>
      )
    }
    return (
      <img
        key={`img-${index}`}
        src={pages[index]}
        alt={`Page ${index + 1}`}
        className={
          displayMode === 'single' || fullWidth
            ? 'max-h-screen max-w-full object-contain'
            : 'max-w-[50vw] max-h-screen object-contain'
        }
        onError={() => setErrored((prev) => new Set(prev).add(index))}
      />
    )
  }

  function renderContent() {
    if (displayMode === 'single') {
      return pages.map((_, i) => (
        <div key={`page-${i}`} data-page-index={i} className="flex items-center justify-center">
          {renderPage(i)}
        </div>
      ))
    }

    const spreads: React.ReactNode[] = []
    for (let i = 0; i < pages.length; i += 2) {
      if (i + 1 < pages.length) {
        spreads.push(
          <div key={`spread-${i}`} data-page-index={i} className="flex items-center justify-center gap-1">
            {renderPage(i)}
            {renderPage(i + 1)}
          </div>,
        )
      } else {
        spreads.push(
          <div key={`spread-${i}`} data-page-index={i} className="flex items-center justify-center">
            {renderPage(i, true)}
          </div>,
        )
      }
    }
    return spreads
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const sentinels = container.querySelectorAll<HTMLElement>('[data-page-index]')
    if (sentinels.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length === 0) return

        intersecting.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )

        const target = intersecting[0]
        const index = Number((target.target as HTMLElement).getAttribute('data-page-index'))
        if (!isNaN(index)) {
          useReaderStore.getState().setCurrentPage(index)
        }
      },
      {
        root: container,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0,
      },
    )

    sentinels.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [pages, displayMode])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const container = containerRef.current
      if (!container) return

      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      const viewportHeight = container.clientHeight

      switch (e.key) {
        case 'ArrowUp':
          if (container.scrollTop > 0) {
            e.preventDefault()
            container.scrollBy({ top: -(viewportHeight * 0.9), behavior: 'auto' })
          }
          break
        case 'ArrowDown':
          if (container.scrollTop + viewportHeight < container.scrollHeight) {
            e.preventDefault()
            container.scrollBy({ top: viewportHeight * 0.9, behavior: 'auto' })
          }
          break
        case 'PageUp':
          if (container.scrollTop > 0) {
            e.preventDefault()
            container.scrollBy({ top: -viewportHeight, behavior: 'auto' })
          }
          break
        case 'PageDown':
          if (container.scrollTop + viewportHeight < container.scrollHeight) {
            e.preventDefault()
            container.scrollBy({ top: viewportHeight, behavior: 'auto' })
          }
          break
        case ' ':
          if (container.scrollTop + viewportHeight < container.scrollHeight) {
            e.preventDefault()
            container.scrollBy({ top: viewportHeight, behavior: 'auto' })
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (pages.length === 0) return null

  return (
    <div className="relative h-full">
      <ScrollArea
        ref={containerRef}
        className="h-full"
        data-testid="scroll-viewer-container"
      >
        <div className="mx-auto max-w-8xl">
          {renderContent()}
        </div>
      </ScrollArea>
      <PageIndicator
        current={currentPage}
        total={pages.length}
        displayMode={displayMode}
      />
    </div>
  )
}
