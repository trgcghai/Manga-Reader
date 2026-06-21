import { useState, useEffect } from 'react'

interface PageViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  currentPage: number
  onNextPage: () => void
  onPrevPage: () => void
}

function PageIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none select-none">
      {current + 1} / {total}
    </div>
  )
}

export function PageViewer({ pages, displayMode, currentPage, onNextPage, onPrevPage }: PageViewerProps) {
  const [errored, setErrored] = useState<Set<number>>(new Set())

  useEffect(() => {
    setErrored(new Set())
  }, [pages])

  if (pages.length === 0) return null

  const clampedPage = Math.min(currentPage, pages.length - 1)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const third = rect.width / 3

    if (x < third) {
      onPrevPage()
    } else if (x > third * 2) {
      onNextPage()
    }
  }

  function handleImgError(index: number) {
    setErrored(prev => new Set(prev).add(index))
  }

  function renderImage(index: number) {
    if (errored.has(index)) {
      return (
        <div
          key={`placeholder-${index}`}
          className="flex items-center justify-center bg-zinc-800 text-zinc-400 max-h-screen max-w-full aspect-3/4"
          data-testid={`page-placeholder-${index}`}
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
        className={displayMode === 'single' ? 'max-h-screen max-w-full object-contain' : 'max-h-screen max-w-[50vw] object-contain'}
        onError={() => handleImgError(index)}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center h-full relative"
      onClick={handleClick}
      data-testid="page-viewer-container"
    >
      {displayMode === 'single' ? (
        renderImage(clampedPage)
      ) : (
        <div className="flex items-center justify-center gap-1 h-full">
          {renderImage(clampedPage)}
          {clampedPage + 1 < pages.length ? renderImage(clampedPage + 1) : <div className="w-[50vw]" />}
        </div>
      )}
      <PageIndicator current={clampedPage} total={pages.length} />
    </div>
  )
}
