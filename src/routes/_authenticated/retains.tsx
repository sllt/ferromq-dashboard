import { createFileRoute } from '@tanstack/react-router'
import { RetainsPage } from '@/features/retains/retains-page'

export const Route = createFileRoute('/_authenticated/retains')({
  component: RetainsPage,
})
