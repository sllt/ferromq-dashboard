import { createFileRoute } from '@tanstack/react-router'
import { BlacklistPage } from '@/features/blacklist/blacklist-page'

export const Route = createFileRoute('/_authenticated/blacklist')({
  component: BlacklistPage,
})
