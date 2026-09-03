import { createFileRoute } from '@tanstack/react-router'
import { PluginsPage } from '@/features/plugins/plugins-page'

export const Route = createFileRoute('/_authenticated/plugins/')({
  component: PluginsPage,
})
