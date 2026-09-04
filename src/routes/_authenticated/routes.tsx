import { createFileRoute } from '@tanstack/react-router'
import { RoutesPage } from '@/features/routes/routes-page'

export const Route = createFileRoute('/_authenticated/routes')({
  component: RoutesPage,
})
