import { createFileRoute } from '@tanstack/react-router'
import { BrokerConfigPage } from '@/features/broker-config/broker-config-page'

export const Route = createFileRoute('/_authenticated/broker-config')({
  component: BrokerConfigPage,
})
