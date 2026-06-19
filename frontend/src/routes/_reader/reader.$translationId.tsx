import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_reader/reader/$translationId')({
  component: ReaderPage,
})

function ReaderPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Reader placeholder</p>
    </div>
  )
}
