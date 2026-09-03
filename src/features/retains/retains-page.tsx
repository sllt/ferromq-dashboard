import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
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
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastApiError } from '@/lib/api'
import { endpoints } from '@/lib/endpoints'
import type { RetainItem } from '@/lib/types'
import { decodeBase64Utf8 } from '@/lib/utils'

export function RetainsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [topicFilter, setTopicFilter] = useState('#')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)
  const [applied, setApplied] = useState({ topic_filter: '#', offset: 0, limit: 50 })
  const [preview, setPreview] = useState<RetainItem | null>(null)
  const [delTopic, setDelTopic] = useState<string | null>(null)

  const listQ = useQuery({
    queryKey: ['retains', applied],
    queryFn: () => endpoints.retains(applied),
  })

  const delMut = useMutation({
    mutationFn: (topic: string) => endpoints.deleteRetain(topic),
    onSuccess: async () => {
      toast.success(t('retains.deleted'))
      await qc.invalidateQueries({ queryKey: ['retains'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<RetainItem>[]>(
    () => [
      { accessorKey: 'topic', header: t('common.topic') },
      {
        id: 'qos',
        header: t('common.qos'),
        cell: ({ row }) => row.original.publish?.qos ?? '—',
      },
      {
        id: 'from',
        header: t('retains.from'),
        cell: ({ row }) => row.original.from?.id?.client_id ?? row.original.from?.typ ?? '—',
      },
      {
        id: 'ttl',
        header: t('retains.ttl'),
        cell: ({ row }) => row.original.remaining_ttl ?? '—',
      },
      {
        id: 'created',
        header: t('retains.created'),
        cell: ({ row }) =>
          row.original.publish?.create_time
            ? new Date(row.original.publish.create_time).toLocaleString()
            : '—',
      },
      {
        id: 'payload',
        header: t('retains.payload'),
        cell: ({ row }) => {
          const text = decodeBase64Utf8(row.original.publish?.payload)
          return <span className="block max-w-xs truncate">{text || '—'}</span>
        },
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPreview(row.original)}>
              {t('retains.preview')}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDelTopic(row.original.topic)}>
              {t('common.delete')}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  const items = listQ.data?.items ?? []
  const hasMore = listQ.data?.has_more ?? false

  return (
    <div>
      <PageHeader
        title={t('retains.title')}
        description={t('retains.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('retains.topicFilter')}</Label>
          <Input className="w-64 font-mono" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('common.offset')}</Label>
          <Input className="w-24" type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('common.limit')}</Label>
          <Input className="w-24" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
        </div>
        <Button size="sm" onClick={() => setApplied({ topic_filter: topicFilter || '#', offset, limit })}>
          {t('common.apply')}
        </Button>
        {hasMore ? <span className="text-xs text-muted-foreground">{t('common.more')}</span> : null}
      </div>

      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={items} searchKey="topic" />
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.topic}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
            {preview
              ? JSON.stringify(
                  {
                    ...preview,
                    decoded: decodeBase64Utf8(preview.publish?.payload),
                  },
                  null,
                  2,
                )
              : ''}
          </pre>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTopic} onOpenChange={(o) => !o && setDelTopic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('retains.deleteConfirm', { topic: delTopic })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (delTopic) delMut.mutate(delTopic)
                setDelTopic(null)
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
