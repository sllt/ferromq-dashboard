import { createFileRoute } from '@tanstack/react-router'
import { ClientDetailPage } from '@/features/clients/client-detail-page'

export const Route = createFileRoute('/_authenticated/clients/$clientId')({
  component: ClientDetailPage,
})
