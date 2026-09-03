import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { asArray, endpoints } from '@/lib/endpoints'
import type { FeatureFlags, NodeInfo } from '@/lib/types'
import { formatBytes, formatLoad, formatNumber } from '@/lib/utils'

const FEATURE_KEYS: (keyof FeatureFlags)[] = [
  'retain',
  'message_storage',
  'session_storage',
  'delayed',
  'shared_subscription',
  'auto_subscription',
]

export function NodesPage() {
  const { t } = useTranslation()
  const nodesQ = useQuery({ queryKey: ['nodes'], queryFn: () => endpoints.nodes(), refetchInterval: 10000 })
  const brokersQ = useQuery({ queryKey: ['brokers'], queryFn: () => endpoints.brokers() })
  const healthQ = useQuery({ queryKey: ['health'], queryFn: endpoints.health, refetchInterval: 10000 })
  const featuresQ = useQuery({ queryKey: ['features'], queryFn: endpoints.features })

  const loading = nodesQ.isLoading || healthQ.isLoading || featuresQ.isLoading
  const error = nodesQ.error || healthQ.error || featuresQ.error
  const nodes = asArray(nodesQ.data)
  const brokers = asArray(brokersQ.data)

  const columns = useMemo<ColumnDef<NodeInfo>[]>(
    () => [
      { accessorKey: 'node_id', header: 'ID' },
      { accessorKey: 'node_name', header: t('common.node') },
      {
        accessorKey: 'running',
        header: t('common.status'),
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? 'success' : 'destructive'}>
            {getValue() ? t('common.running') : t('common.degraded')}
          </Badge>
        ),
      },
      { accessorKey: 'connections', header: t('nodes.connections'), cell: ({ getValue }) => formatNumber(getValue() as number) },
      {
        id: 'load',
        header: t('nodes.cpu'),
        cell: ({ row }) => `${formatLoad(row.original.load1)} / ${formatLoad(row.original.load5)} / ${formatLoad(row.original.load15)}`,
      },
      {
        id: 'memory',
        header: t('nodes.memory'),
        cell: ({ row }) => `${formatBytes(row.original.memory_used)} / ${formatBytes(row.original.memory_total)}`,
      },
      {
        id: 'disk',
        header: t('nodes.disk'),
        cell: ({ row }) => `${formatBytes(row.original.disk_free)} / ${formatBytes(row.original.disk_total)}`,
      },
      { accessorKey: 'uptime', header: t('nodes.uptime') },
      { accessorKey: 'version', header: t('nodes.version') },
    ],
    [t],
  )

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={() => void nodesQ.refetch()} />

  const features = featuresQ.data
  const health = healthQ.data

  return (
    <div>
      <PageHeader
        title={t('nodes.title')}
        description={t('nodes.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void Promise.all([nodesQ.refetch(), healthQ.refetch(), featuresQ.refetch()])}>
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('nodes.health')}
              <Badge variant={health?.status === 'Running' ? 'success' : 'warning'}>{health?.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(health?.nodes ?? {}).map(([id, node]) => (
              <div key={id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <div className="font-mono">{node.name}</div>
                  <div className="text-xs text-muted-foreground">{node.uptime}</div>
                </div>
                <Badge variant={node.running ? 'success' : 'destructive'}>{node.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('nodes.features')}
              <Badge variant={features?.consistent ? 'success' : 'warning'}>
                {features?.consistent ? t('nodes.consistent') : t('nodes.inconsistent')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">{t('common.node')}</th>
                    {FEATURE_KEYS.map((k) => (
                      <th key={k} className="py-2 pr-3">
                        {t(`nodes.${k}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(features?.nodes ?? []).map((n) => (
                    <tr key={n.node_id} className="border-t">
                      <td className="py-2 pr-3 font-mono">{n.node_name}</td>
                      {FEATURE_KEYS.map((k) => (
                        <td key={k} className="py-2 pr-3">
                          <Badge variant={n.features[k] ? 'success' : 'secondary'}>
                            {n.features[k] ? t('common.yes') : t('common.no')}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(features?.conflicts ?? []).length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-400">
                {features?.conflicts.map((c) => (
                  <div key={c.feature}>
                    {c.feature}: {c.values.map((v) => `${String(v.value)} → [${v.node_ids.join(',')}]`).join(' · ')}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <DataTable columns={columns} data={nodes} searchKey="node_name" />

      {brokers.length > 0 ? (
        <div className="mt-4 text-xs text-muted-foreground">
          {brokers.map((b) => `${b.node_name} ${b.version ?? ''} ${b.datetime ?? ''}`).join(' · ')}
        </div>
      ) : null}
    </div>
  )
}
