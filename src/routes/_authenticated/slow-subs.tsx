import { createFileRoute } from '@tanstack/react-router'
import { SlowSubsPage } from '@/features/slow-subs/slow-subs-page'

export const Route = createFileRoute('/_authenticated/slow-subs')({
  component: SlowSubsPage,
})
