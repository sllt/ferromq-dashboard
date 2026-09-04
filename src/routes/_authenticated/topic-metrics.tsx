import { createFileRoute } from '@tanstack/react-router'
import { TopicMetricsPage } from '@/features/topic-metrics/topic-metrics-page'

export const Route = createFileRoute('/_authenticated/topic-metrics')({
  component: TopicMetricsPage,
})
