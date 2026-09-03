import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toastApiError } from '@/lib/api'
import { endpoints } from '@/lib/endpoints'
import type { SubscriptionInfo } from '@/lib/types'

export function ClientDetailPage() {
  const { t } = useTranslation()
  const { clientId } = useParams({ from: '/_authenticated/clients/$clientId' })
  const qc = useQueryClient()

  const clientQ = useQuery({ queryKey: ['client', clientId], queryFn: () => endpoints.client(clientId) })
  const subsQ = useQuery({
    queryKey: ['client-subs', clientId],
    queryFn: () => endpoints.clientSubscriptions(clientId),
  })

  const unsubMut = useMutation({
    mutationFn: (topic: string) => endpoints.unsubscribe({ clientid: clientId, topic }),
    onSuccess: async () => {
      toast.success(t('clients.unsubscribed'))
      await qc.invalidateQueries({ queryKey: ['client-subs', clientId] })
    },
    onError: toastApiError,
  })

  const kickMut = useMutation({
    mutationFn: () => endpoints.kickClient(clientId),
    onSuccess: async () => {
      toast.success(t('clients.kicked'))
      await qc.invalidateQueries({ queryKey: ['client', clientId] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<SubscriptionInfo>[]>(
    () => [
      { accessorKey: 'topic', header: t('common.topic') },
      { accessorKey: 'qos', header: t('common.qos') },
      { accessorKey: 'share', header: t('subs.share') },
      { accessorKey: 'node_id', header: t('common.node') },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => unsubMut.mutate(row.original.topic)}>
            {t('clients.unsubscribe')}
          </Button>
        ),
      },
    ],
    [t, unsubMut],
  )

  if (clientQ.isLoading) return <PageSkeleton cards={2} />
  if (clientQ.error) return <ErrorState error={clientQ.error} onRetry={() => void clientQ.refetch()} />

  const c = clientQ.data
  if (!c) return null

  const fields: [string, unknown][] = [
    [t('common.node'), c.node_id],
    [t('common.username'), c.username],
    [t('clients.ip'), `${c.ip_address ?? ''}:${c.port ?? ''}`],
    [t('clients.proto'), c.proto_ver],
    [t('clients.keepalive'), c.keepalive],
    [t('clients.cleanStart'), c.clean_start ? t('common.yes') : t('common.no')],
    [t('clients.sessionPresent'), c.session_present ? t('common.yes') : t('common.no')],
    [t('clients.expiry'), c.expiry_interval],
    [t('clients.created'), c.created_at],
    [t('clients.connected'), c.connected_at],
    [t('clients.reason'), c.disconnected_reason || c.disconnected_at],
    [t('clients.mqueue'), `${c.mqueue_len ?? 0} / ${c.max_mqueue ?? 0}`],
    [t('clients.inflight'), `${c.inflight ?? 0} / ${c.max_inflight ?? 0}`],
    [t('clients.subs'), `${c.subscriptions_cnt ?? 0} / ${c.max_subscriptions ?? 0}`],
  ]

  return (
    <div>
      <Button asChild size="sm" variant="ghost" className="mb-3">
        <Link to="/clients">
          <ArrowLeft /> {t('nav.clients')}
        </Link>
      </Button>
      <PageHeader
        title={t('clients.detailTitle', { id: c.clientid })}
        description={t('clients.detailDesc')}
        actions={
          <Button size="sm" variant="destructive" onClick={() => kickMut.mutate()}>
            {t('clients.kick')}
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('common.detail')}</CardTitle>
          <Badge variant={c.connected ? 'success' : 'secondary'}>
            {c.connected ? t('common.online') : t('common.offline')}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="font-mono text-sm">{v == null || v === '' ? '—' : String(v)}</div>
            </div>
          ))}
          {c.last_will ? (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">{t('clients.will')}</div>
              <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
                {JSON.stringify(c.last_will, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {subsQ.isLoading ? (
        <PageSkeleton cards={0} rows={5} />
      ) : subsQ.error ? (
        <ErrorState error={subsQ.error} onRetry={() => void subsQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={subsQ.data?.items ?? []} searchKey="topic" />
      )}
    </div>
  )
}
