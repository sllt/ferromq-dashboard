import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { partitionCluster } from '@/lib/cluster'
import { isAclPlugin } from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import type { NodePlugins, PluginInfo } from '@/lib/types'

type Row = PluginInfo & { node: number }

export function PluginsPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()

  const listQ = useQuery({ queryKey: ['plugins'], queryFn: endpoints.plugins })
  const clustered = partitionCluster<NodePlugins>(listQ.data?.items)
  const cluster = clustered.ok

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['plugins'] })
  }

  const loadMut = useMutation({
    mutationFn: ({ node, name }: { node: number; name: string }) => endpoints.pluginLoad(node, name),
    onSuccess: async () => {
      toast.success(t('plugins.loaded'))
      await invalidate()
    },
    onError: toastApiError,
  })
  const unloadMut = useMutation({
    mutationFn: ({ node, name }: { node: number; name: string }) => endpoints.pluginUnload(node, name),
    onSuccess: async () => {
      toast.success(t('plugins.unloaded'))
      await invalidate()
    },
    onError: toastApiError,
  })
  const reloadMut = useMutation({
    mutationFn: ({ node, name }: { node: number; name: string }) => endpoints.pluginReload(node, name),
    onSuccess: async () => {
      toast.success(t('plugins.reloaded'))
      await invalidate()
    },
    onError: toastApiError,
  })

  const rows: Row[] = cluster.flatMap((n) => (n.plugins ?? []).map((p) => ({ ...p, node: n.node })))

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'node', header: t('common.node') },
      { accessorKey: 'name', header: t('plugins.title') },
      { accessorKey: 'version', header: t('plugins.version') },
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
        accessorKey: 'inited',
        header: t('plugins.inited'),
        cell: ({ getValue }) => (getValue() ? t('common.yes') : t('common.no')),
      },
      {
        accessorKey: 'immutable',
        header: t('plugins.immutable'),
        cell: ({ getValue }) =>
          getValue() ? <Badge variant="warning">{t('plugins.immutable')}</Badge> : t('common.no'),
      },
      {
        accessorKey: 'descr',
        header: t('common.detail'),
        cell: ({ getValue }) => <span className="block max-w-xs truncate">{String(getValue() ?? '')}</span>,
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => {
          const p = row.original
          const locked = p.immutable
          return (
            <div className="flex flex-wrap gap-1.5">
              {canWrite ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked || p.active}
                    onClick={() => loadMut.mutate({ node: p.node, name: p.name })}
                  >
                    {t('plugins.load')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked || !p.active}
                    onClick={() => unloadMut.mutate({ node: p.node, name: p.name })}
                  >
                    {t('plugins.unload')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked}
                    onClick={() => reloadMut.mutate({ node: p.node, name: p.name })}
                  >
                    {t('plugins.reload')}
                  </Button>
                </>
              ) : null}
              <Button asChild size="sm" variant="secondary">
                <Link to="/plugins/$nodeId/$plugin" params={{ nodeId: String(p.node), plugin: p.name }}>
                  {t('plugins.config')}
                </Link>
              </Button>
            </div>
          )
        },
      },
    ],
    [t, canWrite, loadMut, unloadMut, reloadMut],
  )

  return (
    <div>
      <PageHeader
        title={t('plugins.title')}
        description={t('plugins.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      <p className="mb-3 text-xs text-muted-foreground">{t('plugins.immutableHint')}</p>
      {rows.some((r) => isAclPlugin(r.name)) ? (
        <p className="mb-3 text-xs text-muted-foreground">{t('config.aclHint')}</p>
      ) : null}
      {clustered.errors.length > 0 ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          {clustered.errors.map((e) => (
            <div key={e.key}>{t('cluster.nodeFailed', { node: e.key, error: e.error })}</div>
          ))}
        </div>
      ) : null}
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchKey="name"
          footer={
            listQ.data ? (
              <p className="text-xs text-muted-foreground">
                {t('list.clusterRows', { count: listQ.data.rowCount })}
                {listQ.data.truncated ? ` · ${t('list.truncatedShort')}` : ''}
              </p>
            ) : null
          }
        />
      )}
    </div>
  )
}
