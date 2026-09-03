import { createFileRoute } from '@tanstack/react-router'
import { BridgesPage } from '@/features/bridges/bridges-page'

export const Route = createFileRoute('/_authenticated/bridges/')({
  component: BridgesPage,
})
