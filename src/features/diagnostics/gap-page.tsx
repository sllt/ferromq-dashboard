import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { CapabilityGapView } from '@/features/diagnostics/gap-view'
import type { CapabilityGap } from '@/lib/types'

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
      ) : q.data?.available === false || q.data?.available === undefined ? (
        <CapabilityGapView data={q.data} title={t(unavailableKey)} extra={extra} />
      ) : (
        <CapabilityGapView
          data={{ available: false, gap: t('gap.hint'), items: [] }}
          title={t(unavailableKey)}
          extra={extra}
        />
      )}
    </div>
  )
}
