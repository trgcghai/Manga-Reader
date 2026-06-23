import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppHeader } from '#/components/app/AppHeader'
import { AppFooter } from '#/components/app/AppFooter'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
