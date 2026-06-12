import { AdminSidebar } from '#/components/AdminSidebar'
import { SidebarProvider } from '#/components/ui/sidebar'
import {
  createFileRoute,
  Outlet,
} from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="w-full p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
