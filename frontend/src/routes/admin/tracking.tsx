import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/tracking')({
  component: AdminTrackingPage,
})

function AdminTrackingPage() {
  return <div>tracking page</div>
}
