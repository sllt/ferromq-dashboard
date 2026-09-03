import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { summarizeAttrs } from '@/lib/integrations'
import type { BridgeInfo } from '@/lib/types'

export function BridgesPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()

  const listQ = useQuery({ queryKey: ['bridges'], queryFn: endpoints.bridges })

  const loadMut = useMutation({
    mutationFn: (name: string) => endpoints.bridgeLoad(name),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bridges'] })
    },
    onError: toastApiError,
  })
  const unloadMut = useMutation({
    mutationFn: (name: string) => endpoints.bridgeUnload(name),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bridges'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<BridgeInfo>[]>(
    () => [
      { accessorKey: 'name', header: t('bridges.name') },
      {
        id: 'direction',
        header: t('bridges.direction'),
        cell: ({ row }) => <Badge variant="outline">{row.original.kind?.direction ?? '—'}</Badge>,
      },
      {
        id: 'transport',
        header: t('bridges.transport'),
        cell: ({ row }) => row.original.kind?.transport ?? '—',
      },
      {
        accessorKey: 'available',
        header: t('integrations.available'),
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="success">{t('integrations.available')}</Badge>
          ) : (
            <Badge variant="secondary">{t('integrations.unavailable')}</Badge>
          ),
      },
      {
        accessorKey: 'active',
        header: t('plugins.active'),
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'secondary'}>
            {row.original.active ? t('plugins.active') : t('plugins.inactive')}
          </Badge>
        ),
      },
      {
        id: 'attrs',
        header: t('bridges.attrs'),
        cell: ({ row }) => (
          <span className="block max-w-xs truncate font-mono text-[11px] text-muted-foreground">
            {summarizeAttrs(row.original.attrs) || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => {
          const b = row.original
          const locked = b.immutable
          return (
            <div className="flex flex-wrap gap-1.5">
              {canWrite ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked || b.active || !b.available}
                    onClick={() => loadMut.mutate(b.name)}
                  >
                    {t('plugins.load')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked || !b.active}
                    onClick={() => unloadMut.mutate(b.name)}
                  >
                    {t('plugins.unload')}
                  </Button>
                </>
              ) : null}
              <Button asChild size="sm" variant="secondary">
                <Link to="/bridges/$plugin" params={{ plugin: b.name }}>
                  {t('plugins.config')}
                </Link>
              </Button>
            </div>
          )
        },
      },
    ],
    [t, canWrite, loadMut, unloadMut],
  )

  return (
    <div>
      <PageHeader
        title={t('bridges.title')}
        description={t('bridges.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      {listQ.data?.note ? <p className="mb-3 text-xs text-muted-foreground">{listQ.data.note}</p> : null}
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={listQ.data?.items ?? []} searchKey="name" />
      )}
    </div>
  )
}
