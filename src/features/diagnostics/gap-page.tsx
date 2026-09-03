import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CapabilityGapView } from '@/features/diagnostics/gap-view'
import type { CapabilityGap } from '@/lib/types'

function hasAvailablePayload(data?: CapabilityGap): data is CapabilityGap {
  return data != null && data.available !== false
}

function CapabilityAvailableView({ data, extra }: { data: CapabilityGap; extra?: ReactNode }) {
  const { t } = useTranslation()
  const items = data.items ?? []
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {t('gap.availableTitle')}
            <Badge variant="success">available</Badge>
          </CardTitle>
          <CardDescription>{data.gap ?? t('gap.availableHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          {data.kind ? (
            <div>
              kind=<span className="font-mono">{data.kind}</span>
            </div>
          ) : null}
          {data.plugin ? (
            <div>
              plugin=<span className="font-mono">{data.plugin}</span>
            </div>
          ) : null}
          <div>{t('common.rows', { count: items.length })}</div>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <EmptyState title={t('common.empty')} hint={t('gap.availableHint')} />
      ) : (
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
          {JSON.stringify(items, null, 2)}
        </pre>
      )}
      {extra}
    </div>
  )
}

export function DiagnosticGapPage({
  queryKey,
  queryFn,
  titleKey,
  descKey,
  unavailableKey,
  extra,
}: {
  queryKey: string
  queryFn: () => Promise<CapabilityGap>
  titleKey: string
  descKey: string
  unavailableKey: string
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: [queryKey], queryFn })

  return (
    <div>
      <PageHeader
        title={t(titleKey)}
        description={t(descKey)}
        actions={
          <Button size="sm" variant="outline" onClick={() => void q.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      {q.isLoading ? (
        <PageSkeleton cards={1} rows={2} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : hasAvailablePayload(q.data) ? (
        <CapabilityAvailableView data={q.data} extra={extra} />
      ) : (
        <CapabilityGapView data={q.data} title={t(unavailableKey)} extra={extra} />
      )}
    </div>
  )
}
