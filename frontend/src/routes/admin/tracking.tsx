import { createFileRoute } from '@tanstack/react-router'
import { TrackingPage } from '#/components/tracking/TrackingPage'

export const Route = createFileRoute('/admin/tracking')({
  component: AdminTrackingPage,
})

function AdminTrackingPage() {
  return <TrackingPage />
}
