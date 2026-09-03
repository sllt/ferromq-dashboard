import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { endpoints } from '@/lib/endpoints'
import type { ClientInfo, ClientQuery } from '@/lib/types'

export function ClientsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'all' | 'offline'>('all')
  const [draft, setDraft] = useState<ClientQuery>({ _limit: 1000 })
  const [query, setQuery] = useState<ClientQuery>({ _limit: 1000 })
  const [kickId, setKickId] = useState<string | null>(null)
  const [kickOff, setKickOff] = useState(false)

  const listQ = useQuery({
    queryKey: ['clients', tab, query],
    queryFn: () => (tab === 'offline' ? endpoints.offlines(query) : endpoints.clients(query)),
  })

  const kickMut = useMutation({
    mutationFn: (id: string) => endpoints.kickClient(id),
    onSuccess: async () => {
      toast.success(t('clients.kicked'))
      await qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: toastApiError,
  })

  const kickOffMut = useMutation({
    mutationFn: () => endpoints.kickOfflines(query),
    onSuccess: async (res) => {
      toast.success(t('clients.kickedCount', { count: res.count }))
      await qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<ClientInfo>[]>(
    () => [
      {
        accessorKey: 'clientid',
        header: t('common.client'),
        cell: ({ row }) => (
          <Link to="/clients/$clientId" params={{ clientId: row.original.clientid }} className="text-primary hover:underline">
            {row.original.clientid}
          </Link>
        ),
      },
      { accessorKey: 'username', header: t('common.username') },
      { accessorKey: 'node_id', header: t('common.node') },
      {
        accessorKey: 'connected',
        header: t('common.status'),
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? 'success' : 'secondary'}>
            {getValue() ? t('common.online') : t('common.offline')}
          </Badge>
        ),
      },
      {
        id: 'addr',
        header: t('clients.ip'),
        cell: ({ row }) => `${row.original.ip_address ?? ''}:${row.original.port ?? ''}`,
      },
      { accessorKey: 'proto_ver', header: t('clients.proto') },
      { accessorKey: 'subscriptions_cnt', header: t('clients.subs') },
      { accessorKey: 'mqueue_len', header: t('clients.mqueue') },
      { accessorKey: 'connected_at', header: t('clients.connected') },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => setKickId(row.original.clientid)}>
            {t('clients.kick')}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={t('clients.title')}
        description={t('clients.desc')}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
              {t('common.refresh')}
            </Button>
            {tab === 'offline' ? (
              <Button size="sm" variant="destructive" onClick={() => setKickOff(true)}>
                {t('clients.kickOfflines')}
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'offline')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t('clients.tabAll')}</TabsTrigger>
          <TabsTrigger value="offline">{t('clients.tabOffline')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('clients.likeId')}>
          <Input value={draft._like_clientid ?? ''} onChange={(e) => setDraft({ ...draft, _like_clientid: e.target.value })} />
        </Field>
        <Field label={t('clients.likeUser')}>
          <Input value={draft._like_username ?? ''} onChange={(e) => setDraft({ ...draft, _like_username: e.target.value })} />
        </Field>
        <Field label={t('clients.ip')}>
          <Input value={draft.ip_address ?? ''} onChange={(e) => setDraft({ ...draft, ip_address: e.target.value })} />
        </Field>
        <Field label={t('common.client')}>
          <Input value={draft.clientid ?? ''} onChange={(e) => setDraft({ ...draft, clientid: e.target.value })} />
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button
            size="sm"
            onClick={() =>
              setQuery({
                ...draft,
                _limit: draft._limit ?? 1000,
              })
            }
          >
            {t('common.apply')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft({ _limit: 1000 })
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
        <DataTable columns={columns} data={listQ.data ?? []} searchKey="clientid" />
      )}

      <AlertDialog open={!!kickId} onOpenChange={(o) => !o && setKickId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.kick')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clients.kickConfirm', { id: kickId })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (kickId) kickMut.mutate(kickId)
                setKickId(null)
              }}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={kickOff} onOpenChange={setKickOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.kickOfflines')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clients.kickOfflinesConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                kickOffMut.mutate()
                setKickOff(false)
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
