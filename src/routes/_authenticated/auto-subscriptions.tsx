import { createFileRoute } from '@tanstack/react-router'
import { AutoSubscriptionsPage } from '@/features/auto-subscriptions/auto-subscriptions-page'

export const Route = createFileRoute('/_authenticated/auto-subscriptions')({
  component: AutoSubscriptionsPage,
})
