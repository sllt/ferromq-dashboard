import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { ListMeta } from '@/components/list-meta'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CapabilityGapView } from '@/features/diagnostics/gap-view'
import { parseTopicMetrics } from '@/lib/diagnostics'
import { endpoints } from '@/lib/endpoints'
import { DEFAULT_PAGE_SIZE, pagingParams } from '@/lib/list'
import type { PageResult } from '@/lib/list'
import type { TopicMetricItem } from '@/lib/types'

export function TopicMetricsPage() {
  const { t } = useTranslation()
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const q = useQuery({
    queryKey: ['topic-metrics', offset, limit],
    queryFn: () => endpoints.topicMetrics(pagingParams(offset, limit)),
  })

  const parsed = parseTopicMetrics(q.data) ?? (q.data ? { ...q.data, items: q.data.items ?? [] } : null)

  const columns = useMemo<ColumnDef<TopicMetricItem>[]>(
    () => [
      { accessorKey: 'topic', header: t('common.topic') },
      {
        accessorKey: 'subscribers',
        header: t('topicMetrics.subscribers'),
        cell: ({ getValue }) => String(getValue() ?? 0),
      },
      {
        accessorKey: 'node_ids',
        header: t('topicMetrics.nodes'),
        cell: ({ getValue }) => {
          const ids = getValue() as number[] | undefined
          return ids?.length ? ids.join(', ') : '—'
        },
      },
    ],
    [t],
  )

  const page: PageResult<TopicMetricItem> | null = parsed
    ? {
        items: parsed.items,
        rowCount: parsed.items.length,
        truncated: parsed.truncated === true,
        offset: parsed.offset ?? offset,
        limit: parsed.limit ?? limit,
        format: 'page',
      }
    : null

  return (
    <div>
      <PageHeader
        title={t('topicMetrics.title')}
        description={t('topicMetrics.desc')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/routes">{t('topicMetrics.openRoutes')}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/">{t('topicMetrics.openOverview')}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void q.refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      {q.isLoading ? (
        <PageSkeleton cards={2} rows={6} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : parsed?.available === false ? (
        <CapabilityGapView data={parsed} title={t('gap.title')} />
      ) : parsed ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
            {parsed.note ?? t('topicMetrics.banner')}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                {t('topicMetrics.sysTitle')}
                <Badge variant={parsed.sys_topic?.active ? 'success' : 'secondary'}>
                  {parsed.sys_topic?.active ? t('plugins.active') : t('integrations.unavailable')}
                </Badge>
              </CardTitle>
              <CardDescription>
                {parsed.sys_topic?.active ? t('topicMetrics.sysActive') : t('topicMetrics.sysMissing')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>
                {t('topicMetrics.sysPlugin')}:{' '}
                <span className="font-mono">{parsed.sys_topic?.plugin ?? 'ferromq-sys-topic'}</span>
              </div>
              {(parsed.sys_topic?.topics ?? []).length > 0 ? (
                <ul className="list-inside list-disc font-mono">
                  {parsed.sys_topic?.topics?.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t('topicMetrics.kind')}</span>
            <Badge variant="outline">
              {parsed.kind === 'route_derived' ? t('topicMetrics.kind_route_derived') : (parsed.kind ?? '—')}
            </Badge>
          </div>
          {parsed.items.length === 0 ? (
            <EmptyState title={t('topicMetrics.empty')} hint={t('topicMetrics.banner')} />
          ) : (
            <DataTable
              columns={columns}
              data={parsed.items}
              searchKey="topic"
              hidePagination
              footer={
                page ? (
                  <ListMeta
                    page={page}
                    onOffsetChange={setOffset}
                    onLimitChange={(n) => {
                      setLimit(n)
                      setOffset(0)
                    }}
                  />
                ) : null
              }
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
