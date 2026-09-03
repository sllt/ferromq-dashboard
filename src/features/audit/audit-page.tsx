import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { ListMeta } from '@/components/list-meta'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { AdminUnavailable } from '@/components/write-gate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCanAdmin } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { DEFAULT_PAGE_SIZE, pagingParams } from '@/lib/list'
import { formatUnixTime } from '@/lib/session-user'
import type { AuditEvent } from '@/lib/types'

const ACTIONS = [
  'login',
  'login_failed',
  'change_password',
  'kick_client',
  'publish',
  'plugin_load',
  'plugin_unload',
  'plugin_reload',
  'api_key_create',
  'api_key_delete',
  'user_create',
  'user_disable',
  'user_enable',
] as const

type Filters = {
  action: string
  username: string
  success: string
}

export function AuditPage() {
  const { t } = useTranslation()
  const canAdmin = useCanAdmin()
  const [draft, setDraft] = useState<Filters>({ action: '', username: '', success: '' })
  const [filters, setFilters] = useState<Filters>({ action: '', username: '', success: '' })
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const listQ = useQuery({
    queryKey: ['audit', filters, offset, limit],
    queryFn: () =>
      endpoints.audit({
        ...pagingParams(offset, limit),
        action: filters.action || undefined,
        username: filters.username || undefined,
        success: filters.success || undefined,
      }),
    enabled: canAdmin,
  })

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: 'ts',
        header: t('audit.time'),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap font-mono text-xs">{formatUnixTime(getValue() as number)}</span>
        ),
      },
      { accessorKey: 'action', header: t('audit.action') },
      { accessorKey: 'username', header: t('common.username') },
      { accessorKey: 'role', header: t('users.role') },
      { accessorKey: 'auth', header: t('audit.auth') },
      {
        accessorKey: 'success',
        header: t('audit.result'),
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="success">{t('audit.ok')}</Badge>
          ) : (
            <Badge variant="destructive">{t('audit.fail')}</Badge>
          ),
      },
      {
        accessorKey: 'resource',
        header: t('audit.resource'),
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span>,
      },
      { accessorKey: 'ip', header: t('audit.ip') },
      {
        accessorKey: 'request_id',
        header: t('audit.requestId'),
        cell: ({ getValue }) => <span className="font-mono text-[11px] text-muted-foreground">{String(getValue() ?? '')}</span>,
      },
    ],
    [t],
  )

  if (!canAdmin) {
    return (
      <div>
        <PageHeader title={t('audit.title')} description={t('audit.desc')} />
        <AdminUnavailable page={t('nav.audit')} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('audit.title')}
        description={t('audit.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('audit.action')}</Label>
          <Select value={draft.action || 'all'} onValueChange={(v) => setDraft({ ...draft, action: v === 'all' ? '' : v })}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('common.username')}</Label>
          <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('audit.result')}</Label>
          <Select
            value={draft.success || 'all'}
            onValueChange={(v) => setDraft({ ...draft, success: v === 'all' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="true">{t('audit.ok')}</SelectItem>
              <SelectItem value="false">{t('audit.fail')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            onClick={() => {
              setFilters(draft)
              setOffset(0)
            }}
          >
            {t('common.apply')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const empty = { action: '', username: '', success: '' }
              setDraft(empty)
              setFilters(empty)
              setOffset(0)
              setLimit(DEFAULT_PAGE_SIZE)
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
        <DataTable
          columns={columns}
          data={listQ.data?.items ?? []}
          searchKey="action"
          hidePagination
          footer={
            listQ.data ? (
              <ListMeta
                page={listQ.data}
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
  )
}
