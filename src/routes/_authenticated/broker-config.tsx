import { createFileRoute } from '@tanstack/react-router'
import { BrokerConfigPage } from '@/features/broker-config/broker-config-page'
import type { BrokerConfigSection } from '@/lib/types'

type BrokerConfigSearch = {
  section?: BrokerConfigSection
}

function parseSection(value: unknown): BrokerConfigSection | undefined {
  return value === 'mqtt' || value === 'listener' || value === 'log' ? value : undefined
}

export const Route = createFileRoute('/_authenticated/broker-config')({
  validateSearch: (search: Record<string, unknown>): BrokerConfigSearch => ({
    section: parseSection(search.section),
  }),
  component: BrokerConfigRoute,
})

function BrokerConfigRoute() {
  const { section } = Route.useSearch()
  return <BrokerConfigPage initialSection={section} />
}
