import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toastApiError } from '@/lib/api'
import { endpoints } from '@/lib/endpoints'
import type { PluginInfo } from '@/lib/types'

type Row = PluginInfo & { node: number }

export function PluginsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [config, setConfig] = useState<{ node: number; name: string; json: unknown } | null>(null)

  const listQ = useQuery({ queryKey: ['plugins'], queryFn: endpoints.plugins })

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

  const rows: Row[] = (listQ.data ?? []).flatMap((n) => n.plugins.map((p) => ({ ...p, node: n.node })))

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
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    const json = await endpoints.pluginConfig(p.node, p.name)
                    setConfig({ node: p.node, name: p.name, json })
                  } catch (e) {
                    toastApiError(e)
                  }
                }}
              >
                {t('plugins.config')}
              </Button>
            </div>
          )
        },
      },
    ],
    [t, loadMut, unloadMut, reloadMut],
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
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={rows} searchKey="name" />
      )}

      <Dialog open={!!config} onOpenChange={(o) => !o && setConfig(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {config?.name} @{config?.node}
            </DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
            {config ? JSON.stringify(config.json, null, 2) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
