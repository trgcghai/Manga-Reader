import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/mangas/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
