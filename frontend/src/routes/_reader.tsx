import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_reader')({
  component: ReaderLayout,
})

function ReaderLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
