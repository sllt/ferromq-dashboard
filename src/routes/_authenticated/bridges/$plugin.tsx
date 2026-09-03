import { createFileRoute } from '@tanstack/react-router'
import { BridgeConfigPage } from '@/features/bridges/bridge-config-page'

export const Route = createFileRoute('/_authenticated/bridges/$plugin')({
  component: BridgeConfigPage,
})
