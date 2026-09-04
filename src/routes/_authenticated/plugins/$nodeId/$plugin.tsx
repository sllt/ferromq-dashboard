import { createFileRoute } from '@tanstack/react-router'
import { PluginConfigPage } from '@/features/plugins/plugin-config-page'

export const Route = createFileRoute('/_authenticated/plugins/$nodeId/$plugin')({
  component: PluginConfigPage,
})
