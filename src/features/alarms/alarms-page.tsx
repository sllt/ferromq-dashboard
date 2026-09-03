import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { parseAlarmList } from '@/lib/diagnostics'
import { endpoints } from '@/lib/endpoints'
import { formatUnixTime } from '@/lib/session-user'
import type { Alarm } from '@/lib/types'

function levelVariant(level: string): 'destructive' | 'warning' | 'secondary' {
  if (level === 'critical') return 'destructive'
  if (level === 'warning') return 'warning'
  return 'secondary'
}

export function AlarmsPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [ackId, setAckId] = useState<string | null>(null)

  const activeQ = useQuery({
    queryKey: ['alarms'],
    queryFn: endpoints.alarms,
    refetchInterval: 10_000,
  })
  const historyQ = useQuery({
    queryKey: ['alarms-history'],
    queryFn: endpoints.alarmsHistory,
  })

  const ackMut = useMutation({
    mutationFn: (id: string) => endpoints.acknowledgeAlarm(id),
    onSuccess: async () => {
      toast.success(t('alarms.acked'))
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['alarms'] }),
        qc.invalidateQueries({ queryKey: ['alarms-history'] }),
      ])
    },
    onError: toastApiError,
  })

  const active = parseAlarmList(activeQ.data) ?? { available: true, items: activeQ.data?.items ?? [] }
  const history = parseAlarmList(historyQ.data) ?? { available: true, items: historyQ.data?.items ?? [] }

  const columns = useMemo<ColumnDef<Alarm>[]>(
    () => [
      { accessorKey: 'id', header: t('alarms.id') },
      { accessorKey: 'name', header: t('alarms.name') },
      {
        accessorKey: 'level',
        header: t('alarms.level'),
        cell: ({ getValue }) => {
          const level = String(getValue() ?? '')
          const key = `alarms.level_${level}`
          const label = t(key, { defaultValue: level })
          return <Badge variant={levelVariant(level)}>{label}</Badge>
        },
      },
      {
        accessorKey: 'source',
        header: t('alarms.source'),
        cell: ({ getValue }) => {
          const source = String(getValue() ?? '')
          return t(`alarms.source_${source}`, { defaultValue: source })
        },
      },
      {
        accessorKey: 'node_id',
        header: t('common.node'),
        cell: ({ getValue }) => {
          const id = getValue()
          return id == null ? '—' : String(id)
        },
      },
      { accessorKey: 'message', header: t('alarms.message') },
      {
        accessorKey: 'activated_at',
        header: t('alarms.activated'),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{formatUnixTime(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'acknowledged',
        header: t('alarms.acknowledged'),
        cell: ({ row }) =>
          row.original.acknowledged ? (
            <div className="space-y-0.5">
              <Badge variant="success">{t('common.yes')}</Badge>
              {row.original.acknowledged_by ? (
                <div className="text-[11px] text-muted-foreground">{row.original.acknowledged_by}</div>
              ) : null}
            </div>
          ) : (
            <Badge variant="secondary">{t('common.no')}</Badge>
          ),
      },
      ...(tab === 'history'
        ? ([
            {
              accessorKey: 'cleared_at',
              header: t('alarms.cleared'),
              cell: ({ getValue }) => formatUnixTime(getValue() as number | null),
            },
          ] as ColumnDef<Alarm>[])
        : []),
      ...(tab === 'active'
        ? ([
            {
              id: 'actions',
              header: t('common.actions'),
              cell: ({ row }) =>
                canWrite && !row.original.acknowledged ? (
                  <Button size="sm" variant="outline" onClick={() => setAckId(row.original.id)}>
                    {t('alarms.ack')}
                  </Button>
                ) : null,
            },
          ] as ColumnDef<Alarm>[])
        : []),
    ],
    [canWrite, t, tab],
  )

  const loading = tab === 'active' ? activeQ.isLoading : historyQ.isLoading
  const error = tab === 'active' ? activeQ.error : historyQ.error
  const items = tab === 'active' ? active.items : history.items
  const note = tab === 'active' ? active.note : history.note

  return (
    <div>
      <PageHeader
        title={t('alarms.title')}
        description={t('alarms.desc')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/nodes">{t('alarms.openNodes')}</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void Promise.all([activeQ.refetch(), historyQ.refetch()])}
            >
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        {note ?? t('alarms.derivedNote')}
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v === 'history' ? 'history' : 'active')}>
        <TabsList>
          <TabsTrigger value="active">
            {t('alarms.tabActive')}
            {active.items.length > 0 ? ` (${active.items.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">{t('alarms.tabHistory')}</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <ErrorState
              error={error}
              onRetry={() => void (tab === 'active' ? activeQ.refetch() : historyQ.refetch())}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={tab === 'active' ? t('alarms.emptyTitle') : t('alarms.historyEmpty')}
              hint={tab === 'active' ? t('alarms.emptyHint') : t('alarms.historyHint')}
            />
          ) : (
            <DataTable columns={columns} data={items} searchKey="id" />
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={ackId != null} onOpenChange={(open) => !open && setAckId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('alarms.ack')}</AlertDialogTitle>
            <AlertDialogDescription>{t('alarms.ackConfirm', { id: ackId })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ackId) ackMut.mutate(ackId)
                setAckId(null)
              }}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
