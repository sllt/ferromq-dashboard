import { createFileRoute } from '@tanstack/react-router'
import { ClusterPage } from '@/features/cluster/cluster-page'

export const Route = createFileRoute('/_authenticated/cluster')({
  component: ClusterPage,
})
