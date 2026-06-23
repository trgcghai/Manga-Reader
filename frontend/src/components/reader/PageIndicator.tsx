interface PageIndicatorProps {
  current: number
  total: number
  displayMode: 'single' | 'double'
}

export function PageIndicator({
  current,
  total,
  displayMode,
}: PageIndicatorProps) {
  if (total === 0) return null
  const isDouble = displayMode === 'double'
  const right = Math.min(current + 2, total)
  const label = !isDouble || current + 1 === total || right === current + 1
    ? `${current + 1} / ${total}`
    : `${current + 1}-${right} / ${total}`

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none select-none">
      {label}
    </div>
  )
}
