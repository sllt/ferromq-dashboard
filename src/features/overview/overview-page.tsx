import { useQuery } from '@tanstack/react-query'
import { Cable, Layers, Route as RouteIcon, Radio, Server, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { asArray, endpoints } from '@/lib/endpoints'
import { formatNumber } from '@/lib/utils'
import type { HistoryPoint } from '@/lib/types'

type Range = { minutes?: number; hours?: number; days?: number; key: string }

const ranges: Range[] = [
  { key: 'range5m', minutes: 5 },
  { key: 'range30m', minutes: 30 },
  { key: 'range1h', hours: 1 },
  { key: 'range6h', hours: 6 },
  { key: 'range1d', days: 1 },
]

function stat(stats: Record<string, number> | undefined, key: string) {
  return stats?.[key] ?? 0
}

function historySeries(points: HistoryPoint[] | undefined, keys: string[]) {
  return (points ?? []).map((p) => {
    const row: Record<string, number> = { ts: p.ts }
    for (const key of keys) row[key] = Number(p[key] ?? 0)
    return row
  })
}

export function OverviewPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState<Range>(ranges[1])

  const statsQ = useQuery({ queryKey: ['stats-sum'], queryFn: endpoints.statsSum, refetchInterval: 8000 })
  const metricsQ = useQuery({ queryKey: ['metrics-sum'], queryFn: endpoints.metricsSum, refetchInterval: 8000 })
  const nodesQ = useQuery({ queryKey: ['nodes'], queryFn: () => endpoints.nodes(), refetchInterval: 8000 })
  const brokersQ = useQuery({ queryKey: ['brokers'], queryFn: () => endpoints.brokers(), refetchInterval: 15000 })
  const histQ = useQuery({
    queryKey: ['stats-history-sum', range.key],
    queryFn: () => endpoints.statsHistorySum(range),
    retry: false,
  })
  const metricsHistQ = useQuery({
    queryKey: ['metrics-history-sum', range.key],
    queryFn: () => endpoints.metricsHistorySum(range),
    retry: false,
  })

  const loading = statsQ.isLoading || metricsQ.isLoading || nodesQ.isLoading
  const error = statsQ.error || metricsQ.error || nodesQ.error

  const stats = statsQ.data?.stats
  const metrics = metricsQ.data ?? {}
  const nodes = asArray(nodesQ.data)
  const brokers = asArray(brokersQ.data)

  const connSeries = useMemo(
    () => historySeries(histQ.data?.data, ['connections.count', 'sessions.count', 'subscriptions.count', 'topics.count']),
    [histQ.data],
  )
  const dropSeries = useMemo(
    () => historySeries(metricsHistQ.data?.data, ['messages.dropped', 'messages.nonsubscribed', 'messages.publish', 'messages.delivered']),
    [metricsHistQ.data],
  )

  const historyMissing =
    (histQ.error instanceof ApiError && (histQ.error.status === 404 || histQ.error.status === 500)) ||
    (metricsHistQ.error instanceof ApiError && (metricsHistQ.error.status === 404 || metricsHistQ.error.status === 500))

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={() => void statsQ.refetch()} />

  return (
    <div>
      <PageHeader
        title={t('overview.title')}
        description={t('overview.desc')}
        actions={
          <Button variant="outline" size="sm" onClick={() => void Promise.all([statsQ.refetch(), metricsQ.refetch(), nodesQ.refetch()])}>
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('overview.connections')}
          value={formatNumber(stat(stats, 'connections.count'))}
          hint={t('overview.max', { value: formatNumber(stat(stats, 'connections.max')) })}
          icon={<Cable className="size-4" />}
        />
        <StatCard
          label={t('overview.sessions')}
          value={formatNumber(stat(stats, 'sessions.count'))}
          hint={t('overview.max', { value: formatNumber(stat(stats, 'sessions.max')) })}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label={t('overview.subscriptions')}
          value={formatNumber(stat(stats, 'subscriptions.count'))}
          hint={`${t('overview.shared')} ${formatNumber(stat(stats, 'subscriptions_shared.count'))}`}
          icon={<Radio className="size-4" />}
        />
        <StatCard
          label={t('overview.topics')}
          value={formatNumber(stat(stats, 'topics.count'))}
          hint={`${t('overview.routes')} ${formatNumber(stat(stats, 'routes.count'))}`}
          icon={<RouteIcon className="size-4" />}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('overview.published')} value={formatNumber(metrics['messages.publish'])} />
        <StatCard label={t('overview.delivered')} value={formatNumber(metrics['messages.delivered'])} />
        <StatCard label={t('overview.dropped')} value={formatNumber(metrics['messages.dropped'])} />
        <StatCard
          label={t('overview.retained')}
          value={formatNumber(stat(stats, 'retained.count'))}
          hint={`${t('overview.nonsubscribed')} ${formatNumber(metrics['messages.nonsubscribed'])}`}
          icon={<Layers className="size-4" />}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {ranges.map((r) => (
          <Button key={r.key} size="sm" variant={range.key === r.key ? 'default' : 'outline'} onClick={() => setRange(r)}>
            {t(`overview.${r.key}`)}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('overview.stats')}
          empty={historyMissing || connSeries.length === 0}
          emptyText={t('overview.noHistory')}
          data={connSeries}
          series={[
            { key: 'connections.count', color: 'var(--color-chart-1)', name: t('overview.connections') },
            { key: 'sessions.count', color: 'var(--color-chart-2)', name: t('overview.sessions') },
            { key: 'subscriptions.count', color: 'var(--color-chart-3)', name: t('overview.subscriptions') },
            { key: 'topics.count', color: 'var(--color-chart-4)', name: t('overview.topics') },
          ]}
        />
        <ChartCard
          title={t('overview.metrics')}
          empty={historyMissing || dropSeries.length === 0}
          emptyText={t('overview.noHistory')}
          data={dropSeries}
          series={[
            { key: 'messages.publish', color: 'var(--color-chart-1)', name: t('overview.published') },
            { key: 'messages.delivered', color: 'var(--color-chart-2)', name: t('overview.delivered') },
            { key: 'messages.dropped', color: 'var(--color-chart-5)', name: t('overview.dropped') },
            { key: 'messages.nonsubscribed', color: 'var(--color-chart-4)', name: t('overview.nonsubscribed') },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              {t('overview.nodes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodes.map((n) => (
              <div key={n.node_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="font-mono text-sm">{n.node_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {n.version} · {n.uptime}
                  </div>
                </div>
                <Badge variant={n.running ? 'success' : 'destructive'}>
                  {n.running ? t('common.running') : t('common.degraded')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.brokers')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {brokers.map((b) => (
              <div key={b.node_id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{b.node_name}</span>
                  <Badge variant={b.running ? 'success' : 'warning'}>{b.sysdescr ?? 'FerroMQ'}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.version} · {b.datetime}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  data,
  series,
  empty,
  emptyText,
}: {
  title: string
  data: Record<string, number>[]
  series: { key: string; color: string; name: string }[]
  empty: boolean
  emptyText: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="ts"
                tickFormatter={(v) => new Date(v).toLocaleTimeString()}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
              />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
