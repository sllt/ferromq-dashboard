import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EffectiveBadge } from '@/features/config/effective-badge'
import { MissingPluginConfig } from '@/features/integrations/missing-config'
import { PluginStatusBadges } from '@/features/integrations/status-badges'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { toastWriteResult } from '@/lib/integrations'
import type { AutoSubscription, EffectiveMode, TopicRewrite } from '@/lib/types'
import { REWRITE_ACTIONS } from '@/lib/types'

export function AutoSubscriptionsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('auto')

  return (
    <div>
      <PageHeader title={t('rewrites.title')} description={t('rewrites.desc')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="auto">{t('autoSub.title')}</TabsTrigger>
          <TabsTrigger value="rewrite">{t('topicRewrite.title')}</TabsTrigger>
        </TabsList>
        <TabsContent value="auto">
          <AutoSubPanel />
        </TabsContent>
        <TabsContent value="rewrite">
          <TopicRewritePanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AutoSubPanel() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()
  const [editor, setEditor] = useState<AutoSubscription | 'new' | null>(null)
  const [remove, setRemove] = useState<AutoSubscription | null>(null)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const listQ = useQuery({
    queryKey: ['auto-subscriptions'],
    queryFn: () => endpoints.autoSubscriptions(),
  })

  const deleteMut = useMutation({
    mutationFn: (index: number) => endpoints.autoSubscriptionDelete(index),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'autoSub.deleted', t)
      setRemove(null)
      await qc.invalidateQueries({ queryKey: ['auto-subscriptions'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<AutoSubscription>[]>(
    () => [
      { accessorKey: 'index', header: '#' },
      { accessorKey: 'topic_filter', header: t('autoSub.topicFilter') },
      { accessorKey: 'qos', header: t('common.qos') },
      {
        accessorKey: 'no_local',
        header: t('autoSub.noLocal'),
        cell: ({ getValue }) => (getValue() ? t('common.yes') : t('common.no')),
      },
      {
        accessorKey: 'retain_as_published',
        header: t('autoSub.retainAsPublished'),
        cell: ({ getValue }) => (getValue() ? t('common.yes') : t('common.no')),
      },
      { accessorKey: 'retain_handling', header: t('autoSub.retainHandling') },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditor(row.original)}>
                {t('common.edit')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRemove(row.original)}>
                {t('common.delete')}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canWrite],
  )

  const data = listQ.data
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PluginStatusBadges status={data ?? undefined} />
          <EffectiveBadge mode={lastEffective} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
          {canWrite ? (
            <Button size="sm" onClick={() => setEditor('new')}>
              {t('autoSub.add')}
            </Button>
          ) : null}
        </div>
      </div>
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : data == null ? (
        <MissingPluginConfig plugin="ferromq-auto-subscription" />
      ) : (
        <DataTable columns={columns} data={items} searchKey="topic_filter" />
      )}

      <AutoSubDialog
        open={editor != null}
        item={editor === 'new' || editor == null ? null : editor}
        onOpenChange={(open) => !open && setEditor(null)}
        onSaved={async (effective) => {
          setLastEffective(effective)
          setEditor(null)
          await qc.invalidateQueries({ queryKey: ['auto-subscriptions'] })
        }}
      />
      <ConfirmDelete
        open={remove != null}
        title={t('autoSub.deleteTitle')}
        description={t('autoSub.deleteConfirm', { index: remove?.index })}
        busy={deleteMut.isPending}
        onOpenChange={(open) => !open && setRemove(null)}
        onConfirm={() => remove?.index != null && deleteMut.mutate(remove.index)}
      />
    </div>
  )
}

function TopicRewritePanel() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()
  const [editor, setEditor] = useState<TopicRewrite | 'new' | null>(null)
  const [remove, setRemove] = useState<TopicRewrite | null>(null)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const listQ = useQuery({
    queryKey: ['topic-rewrites'],
    queryFn: () => endpoints.topicRewrites(),
  })

  const deleteMut = useMutation({
    mutationFn: (index: number) => endpoints.topicRewriteDelete(index),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'topicRewrite.deleted', t)
      setRemove(null)
      await qc.invalidateQueries({ queryKey: ['topic-rewrites'] })
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<TopicRewrite>[]>(
    () => [
      { accessorKey: 'index', header: '#' },
      {
        accessorKey: 'action',
        header: t('topicRewrite.action'),
        cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge>,
      },
      { accessorKey: 'source_topic_filter', header: t('topicRewrite.source') },
      { accessorKey: 'dest_topic', header: t('topicRewrite.dest') },
      {
        accessorKey: 'regex',
        header: t('topicRewrite.regex'),
        cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span>,
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditor(row.original)}>
                {t('common.edit')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRemove(row.original)}>
                {t('common.delete')}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canWrite],
  )

  const data = listQ.data
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PluginStatusBadges status={data ?? undefined} />
          <EffectiveBadge mode={lastEffective} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
          {canWrite ? (
            <Button size="sm" onClick={() => setEditor('new')}>
              {t('topicRewrite.add')}
            </Button>
          ) : null}
        </div>
      </div>
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : data == null ? (
        <MissingPluginConfig plugin="ferromq-topic-rewrite" />
      ) : (
        <DataTable columns={columns} data={items} searchKey="source_topic_filter" />
      )}

      <RewriteDialog
        open={editor != null}
        item={editor === 'new' || editor == null ? null : editor}
        onOpenChange={(open) => !open && setEditor(null)}
        onSaved={async (effective) => {
          setLastEffective(effective)
          setEditor(null)
          await qc.invalidateQueries({ queryKey: ['topic-rewrites'] })
        }}
      />
      <ConfirmDelete
        open={remove != null}
        title={t('topicRewrite.deleteTitle')}
        description={t('topicRewrite.deleteConfirm', { index: remove?.index })}
        busy={deleteMut.isPending}
        onOpenChange={(open) => !open && setRemove(null)}
        onConfirm={() => remove?.index != null && deleteMut.mutate(remove.index)}
      />
    </div>
  )
}

function AutoSubDialog({
  open,
  item,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  item: AutoSubscription | null
  onOpenChange: (open: boolean) => void
  onSaved: (effective: EffectiveMode) => Promise<void>
}) {
  const { t } = useTranslation()
  const [topic, setTopic] = useState('')
  const [qos, setQos] = useState('0')
  const [noLocal, setNoLocal] = useState(false)
  const [rap, setRap] = useState(false)
  const [rh, setRh] = useState('0')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTopic(item?.topic_filter ?? '')
    setQos(String(item?.qos ?? 0))
    setNoLocal(item?.no_local === true)
    setRap(item?.retain_as_published === true)
    setRh(String(item?.retain_handling ?? 0))
  }, [open, item])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: AutoSubscription = {
      topic_filter: topic.trim(),
      qos: Number(qos),
      no_local: noLocal,
      retain_as_published: rap,
      retain_handling: Number(rh),
    }
    setBusy(true)
    try {
      const result =
        item?.index != null
          ? await endpoints.autoSubscriptionUpdate(item.index, body)
          : await endpoints.autoSubscriptionAdd(body)
      toastWriteResult(result, item ? 'autoSub.updated' : 'autoSub.created', t)
      await onSaved(result.effective)
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? t('autoSub.edit') : t('autoSub.add')}</DialogTitle>
          <DialogDescription>{t('autoSub.formHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('autoSub.topicFilter')}</Label>
            <Input className="font-mono" value={topic} onChange={(e) => setTopic(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('common.qos')}</Label>
              <Select value={qos} onValueChange={setQos}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('autoSub.retainHandling')}</Label>
              <Select value={rh} onValueChange={setRh}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={noLocal} onCheckedChange={(v) => setNoLocal(v === true)} />
            {t('autoSub.noLocal')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rap} onCheckedChange={(v) => setRap(v === true)} />
            {t('autoSub.retainAsPublished')}
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy || !topic.trim()}>
              {busy ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RewriteDialog({
  open,
  item,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  item: TopicRewrite | null
  onOpenChange: (open: boolean) => void
  onSaved: (effective: EffectiveMode) => Promise<void>
}) {
  const { t } = useTranslation()
  const [action, setAction] = useState('all')
  const [source, setSource] = useState('')
  const [dest, setDest] = useState('')
  const [regex, setRegex] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setAction(item?.action ?? 'all')
    setSource(item?.source_topic_filter ?? '')
    setDest(item?.dest_topic ?? '')
    setRegex(item?.regex ?? '')
  }, [open, item])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: TopicRewrite = {
      action,
      source_topic_filter: source.trim(),
      dest_topic: dest.trim(),
    }
    if (regex.trim()) body.regex = regex.trim()
    setBusy(true)
    try {
      const result =
        item?.index != null
          ? await endpoints.topicRewriteUpdate(item.index, body)
          : await endpoints.topicRewriteAdd(body)
      toastWriteResult(result, item ? 'topicRewrite.updated' : 'topicRewrite.created', t)
      await onSaved(result.effective)
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? t('topicRewrite.edit') : t('topicRewrite.add')}</DialogTitle>
          <DialogDescription>{t('topicRewrite.formHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('topicRewrite.action')}</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWRITE_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`topicRewrite.action_${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('topicRewrite.source')}</Label>
            <Input className="font-mono" value={source} onChange={(e) => setSource(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>{t('topicRewrite.dest')}</Label>
            <Input className="font-mono" value={dest} onChange={(e) => setDest(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>{t('topicRewrite.regex')}</Label>
            <Input className="font-mono" value={regex} onChange={(e) => setRegex(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy || !source.trim() || !dest.trim()}>
              {busy ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDelete({
  open,
  title,
  description,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm}>
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
