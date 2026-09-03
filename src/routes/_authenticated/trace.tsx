import { createFileRoute } from '@tanstack/react-router'
import { TracePage } from '@/features/trace/trace-page'

export const Route = createFileRoute('/_authenticated/trace')({
  component: TracePage,
})
