import { useState, useEffect, useRef } from 'react'
import { useReaderStore } from '#/stores/rootStore'
import { PageIndicator } from './PageIndicator'

interface ScrollViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  onPrevChapter: () => void
  onNextChapter: () => void
}

export function ScrollViewer({
  pages,
  displayMode,
  onPrevChapter,
  onNextChapter,
}: ScrollViewerProps) {
  const [errored, setErrored] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const boundaryHitCount = useRef(0)
  const [cue, setCue] = useState<'prev' | 'next' | null>(null)
  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onPrevChapterRef = useRef(onPrevChapter)
  const onNextChapterRef = useRef(onNextChapter)

  useEffect(() => {
    onPrevChapterRef.current = onPrevChapter
  }, [onPrevChapter])

  useEffect(() => {
    onNextChapterRef.current = onNextChapter
  }, [onNextChapter])

  useEffect(() => {
    setErrored(new Set())
  }, [pages])

  function handleBoundaryScroll(direction: 'prev' | 'next') {
    boundaryHitCount.current += 1
    setCue(direction)

    if (boundaryHitCount.current >= 2) {
      boundaryHitCount.current = 0
      setCue(null)
      if (direction === 'prev') onPrevChapterRef.current()
      else onNextChapterRef.current()
      return
    }

    clearTimeout(cueTimerRef.current)
    cueTimerRef.current = setTimeout(() => {
      boundaryHitCount.current = 0
      setCue(null)
    }, 2000)
  }

  function renderPage(index: number, fullWidth?: boolean) {
    if (errored.has(index)) {
      return (
        <div
          key={`placeholder-${index}`}
          className="flex items-center justify-center bg-zinc-800 text-zinc-400 w-full aspect-3/4"
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
            ? 'w-full h-auto'
            : 'max-w-[50vw] max-h-screen object-contain'
        }
        onError={() => setErrored((prev) => new Set(prev).add(index))}
      />
    )
  }

  function renderContent() {
    if (displayMode === 'single') {
      return pages.map((_, i) => (
        <div key={`page-${i}`} data-page-index={i}>
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
          <div key={`spread-${i}`} data-page-index={i}>
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
      let scrollAmount = 0
      let isBoundary = false
      let boundaryDirection: 'prev' | 'next' | null = null

      switch (e.key) {
        case 'ArrowUp':
          scrollAmount = -(viewportHeight * 0.9)
          if (container.scrollTop <= 0) {
            isBoundary = true
            boundaryDirection = 'prev'
          }
          break
        case 'ArrowDown':
          scrollAmount = viewportHeight * 0.9
          if (container.scrollTop + viewportHeight >= container.scrollHeight) {
            isBoundary = true
            boundaryDirection = 'next'
          }
          break
        case 'PageUp':
          scrollAmount = -viewportHeight
          if (container.scrollTop <= 0) {
            isBoundary = true
            boundaryDirection = 'prev'
          }
          break
        case 'PageDown':
          scrollAmount = viewportHeight
          if (container.scrollTop + viewportHeight >= container.scrollHeight) {
            isBoundary = true
            boundaryDirection = 'next'
          }
          break
        case ' ':
          e.preventDefault()
          scrollAmount = viewportHeight
          if (container.scrollTop + viewportHeight >= container.scrollHeight) {
            isBoundary = true
            boundaryDirection = 'next'
          }
          break
        default:
          return
      }

      if (!isBoundary && scrollAmount !== 0) {
        e.preventDefault()
        container.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      } else if (isBoundary && boundaryDirection) {
        e.preventDefault()
        handleBoundaryScroll(boundaryDirection)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      const c = containerRef.current
      if (!c) return
      if (e.deltaY < 0 && c.scrollTop <= 0) {
        e.preventDefault()
        handleBoundaryScroll('prev')
      } else if (
        e.deltaY > 0 &&
        c.scrollTop + c.clientHeight >= c.scrollHeight
      ) {
        e.preventDefault()
        handleBoundaryScroll('next')
      }
    }

    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false })
    return () => containerRef.current?.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    function handleScroll() {
      const c = containerRef.current
      if (!c) return
      if (boundaryHitCount.current > 0) {
        const atTop = c.scrollTop <= 0
        const atBottom =
          c.scrollTop + c.clientHeight >= c.scrollHeight
        if (!atTop && !atBottom) {
          boundaryHitCount.current = 0
          setCue(null)
        }
      }
    }

    containerRef.current?.addEventListener('scroll', handleScroll, { passive: true })
    return () => containerRef.current?.removeEventListener('scroll', handleScroll)
  }, [])

  if (pages.length === 0) return null

  return (
    <div className="relative h-full">
      {cue === 'prev' && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-16 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
          ↑ Previous Chapter
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        data-testid="scroll-viewer-container"
      >
        {renderContent()}
      </div>
      {cue === 'next' && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center h-16 bg-linear-to-t from-black/60 to-transparent pointer-events-none">
          ↓ Next Chapter
        </div>
      )}
      <PageIndicator
        current={useReaderStore((s) => s.currentPage)}
        total={pages.length}
        displayMode={displayMode}
      />
    </div>
  )
}
