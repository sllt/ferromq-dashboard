import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { endpoints } from '@/lib/endpoints'
import type { SubscriptionInfo } from '@/lib/types'

export function SubscriptionsPage() {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({ clientid: '', topic: '', qos: '', share: '', _match_topic: '', _limit: '1000' })
  const [query, setQuery] = useState<Record<string, unknown>>({ _limit: 1000 })

  const listQ = useQuery({
    queryKey: ['subscriptions', query],
    queryFn: () => endpoints.subscriptions(query),
  })

  const columns = useMemo<ColumnDef<SubscriptionInfo>[]>(
    () => [
      { accessorKey: 'clientid', header: t('common.client') },
      { accessorKey: 'topic', header: t('common.topic') },
      { accessorKey: 'qos', header: t('common.qos') },
      { accessorKey: 'share', header: t('subs.share') },
      { accessorKey: 'client_addr', header: t('subs.addr') },
      { accessorKey: 'node_id', header: t('common.node') },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={t('subs.title')}
        description={t('subs.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('common.client')}>
          <Input value={draft.clientid} onChange={(e) => setDraft({ ...draft, clientid: e.target.value })} />
        </Field>
        <Field label={t('common.topic')}>
          <Input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
        </Field>
        <Field label={t('subs.matchTopic')}>
          <Input value={draft._match_topic} onChange={(e) => setDraft({ ...draft, _match_topic: e.target.value })} />
        </Field>
        <Field label={t('common.qos')}>
          <Input value={draft.qos} onChange={(e) => setDraft({ ...draft, qos: e.target.value })} />
        </Field>
        <Field label={t('subs.share')}>
          <Input value={draft.share} onChange={(e) => setDraft({ ...draft, share: e.target.value })} />
        </Field>
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            onClick={() =>
              setQuery({
                _limit: Number(draft._limit) || 1000,
                clientid: draft.clientid || undefined,
                topic: draft.topic || undefined,
                qos: draft.qos === '' ? undefined : Number(draft.qos),
                share: draft.share || undefined,
                _match_topic: draft._match_topic || undefined,
              })
            }
          >
            {t('common.apply')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft({ clientid: '', topic: '', qos: '', share: '', _match_topic: '', _limit: '1000' })
              setQuery({ _limit: 1000 })
            }}
          >
            {t('common.reset')}
          </Button>
        </div>
      </div>
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={listQ.data ?? []} searchKey="topic" />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
