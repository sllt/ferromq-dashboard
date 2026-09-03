import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
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
import { EffectiveBadge } from '@/features/config/effective-badge'
import { ConnectivityResult } from '@/features/integrations/connectivity-result'
import { MissingPluginConfig } from '@/features/integrations/missing-config'
import { PluginStatusBadges } from '@/features/integrations/status-badges'
import { RevealToggle } from '@/features/integrations/reveal-toggle'
import { toastApiError } from '@/lib/api'
import { useCanAdmin, useCanWrite } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import { linesToList, toastWriteResult } from '@/lib/integrations'
import type { ConnectivityTest, EffectiveMode, WebhookRule } from '@/lib/types'
import { WEBHOOK_HOOKS } from '@/lib/types'

export function WebhooksPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const canAdmin = useCanAdmin()
  const qc = useQueryClient()
  const [reveal, setReveal] = useState(false)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)
  const [queue, setQueue] = useState('')
  const [concurrency, setConcurrency] = useState('')
  const [timeout, setTimeoutMs] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [testUrl, setTestUrl] = useState('')
  const [allowPrivate, setAllowPrivate] = useState(false)
  const [testResult, setTestResult] = useState<ConnectivityTest | null>(null)
  const [editor, setEditor] = useState<WebhookRule | 'new' | null>(null)
  const [removeUrl, setRemoveUrl] = useState<number | null>(null)
  const [removeRule, setRemoveRule] = useState<WebhookRule | null>(null)

  const listQ = useQuery({
    queryKey: ['webhooks', reveal],
    queryFn: () => endpoints.webhooks(reveal),
  })

  const data = listQ.data

  useEffect(() => {
    if (!data) return
    setQueue(data.queue_capacity != null ? String(data.queue_capacity) : '')
    setConcurrency(data.concurrency_limit != null ? String(data.concurrency_limit) : '')
    setTimeoutMs(data.http_timeout != null ? String(data.http_timeout) : '')
  }, [data])

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: ['webhooks'] })
  }

  const settingsMut = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      if (queue !== '') body.queue_capacity = Number(queue)
      if (concurrency !== '') body.concurrency_limit = Number(concurrency)
      if (timeout !== '') body.http_timeout = timeout
      return endpoints.webhooksUpdate(body)
    },
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'webhooks.settingsSaved', t)
      await invalidate()
    },
    onError: toastApiError,
  })

  const addUrlMut = useMutation({
    mutationFn: (url: string) => endpoints.webhookUrlAdd(url),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'webhooks.urlAdded', t)
      setNewUrl('')
      await invalidate()
    },
    onError: toastApiError,
  })

  const deleteUrlMut = useMutation({
    mutationFn: (index: number) => endpoints.webhookUrlDelete(index),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'webhooks.urlDeleted', t)
      setRemoveUrl(null)
      await invalidate()
    },
    onError: toastApiError,
  })

  const deleteRuleMut = useMutation({
    mutationFn: (rule: WebhookRule) => endpoints.webhookRuleDelete(rule.hook ?? '', rule.index ?? 0),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'webhooks.ruleDeleted', t)
      setRemoveRule(null)
      await invalidate()
    },
    onError: toastApiError,
  })

  const testMut = useMutation({
    mutationFn: (url?: string) => endpoints.webhookTest(url ? { url } : {}, allowPrivate),
    onSuccess: (r) => setTestResult(r),
    onError: toastApiError,
  })

  const urlRows = (data?.urls ?? []).map((url, index) => ({ url, index }))

  const urlColumns = useMemo<ColumnDef<{ url: string; index: number }>[]>(
    () => [
      { accessorKey: 'index', header: '#' },
      { accessorKey: 'url', header: t('webhooks.url'), cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {canWrite ? (
              <Button size="sm" variant="outline" onClick={() => testMut.mutate(row.original.url)}>
                {t('integrations.test')}
              </Button>
            ) : null}
            {canWrite ? (
              <Button size="sm" variant="outline" onClick={() => setRemoveUrl(row.original.index)}>
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [t, canWrite, testMut],
  )

  const ruleColumns = useMemo<ColumnDef<WebhookRule>[]>(
    () => [
      { accessorKey: 'hook', header: t('webhooks.hook') },
      { accessorKey: 'index', header: '#' },
      { accessorKey: 'action', header: t('webhooks.action') },
      {
        accessorKey: 'topics',
        header: t('acl.topics'),
        cell: ({ getValue }) => {
          const v = getValue()
          return <span className="font-mono text-xs">{Array.isArray(v) ? v.join(', ') : '—'}</span>
        },
      },
      {
        accessorKey: 'urls',
        header: t('webhooks.urls'),
        cell: ({ getValue }) => {
          const v = getValue()
          return <span className="block max-w-xs truncate font-mono text-xs">{Array.isArray(v) ? v.join(', ') : '—'}</span>
        },
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
              <Button size="sm" variant="outline" onClick={() => setRemoveRule(row.original)}>
                {t('common.delete')}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canWrite],
  )

  return (
    <div>
      <PageHeader
        title={t('webhooks.title')}
        description={t('webhooks.desc')}
        actions={
          <>
            <RevealToggle reveal={reveal} onRevealChange={setReveal} />
            <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />

      {listQ.isLoading ? (
        <PageSkeleton cards={2} rows={4} />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : data == null ? (
        <MissingPluginConfig plugin="ferromq-web-hook" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <PluginStatusBadges status={data} />
            <EffectiveBadge mode={lastEffective} />
          </div>
          {data.note ? <p className="text-xs text-muted-foreground">{data.note}</p> : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('webhooks.settings')}</CardTitle>
              <CardDescription>{t('webhooks.settingsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <NumField label={t('webhooks.queue')} value={queue} onChange={setQueue} disabled={!canWrite} />
              <NumField
                label={t('webhooks.concurrency')}
                value={concurrency}
                onChange={setConcurrency}
                disabled={!canWrite}
              />
              <div className="space-y-1.5">
                <Label>{t('webhooks.timeout')}</Label>
                <Input className="w-36 font-mono text-xs" value={timeout} onChange={(e) => setTimeoutMs(e.target.value)} disabled={!canWrite} />
              </div>
              {canWrite ? (
                <Button size="sm" disabled={settingsMut.isPending} onClick={() => settingsMut.mutate()}>
                  {t('acl.saveSettings')}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">{t('config.viewerReadonly')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhooks.urls')}</CardTitle>
              <CardDescription>{t('webhooks.urlsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canWrite ? (
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newUrl.trim()) addUrlMut.mutate(newUrl.trim())
                  }}
                >
                  <Input
                    className="min-w-64 flex-1 font-mono text-xs"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://hooks.example.com/mqtt"
                  />
                  <Button type="submit" size="sm" disabled={!newUrl.trim() || addUrlMut.isPending}>
                    {t('webhooks.addUrl')}
                  </Button>
                </form>
              ) : null}
              <DataTable columns={urlColumns} data={urlRows} searchKey="url" hidePagination />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t('webhooks.rules')}</CardTitle>
                <CardDescription>{t('webhooks.rulesHint')}</CardDescription>
              </div>
              {canWrite ? (
                <Button size="sm" onClick={() => setEditor('new')}>
                  {t('webhooks.addRule')}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <DataTable columns={ruleColumns} data={data.rules ?? []} searchKey="hook" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('webhooks.testTitle')}</CardTitle>
              <CardDescription>{t('webhooks.testHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1 space-y-1.5">
                  <Label>{t('webhooks.url')}</Label>
                  <Input
                    className="font-mono text-xs"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder={t('webhooks.testUrlHint')}
                  />
                </div>
                {canAdmin ? (
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={allowPrivate} onCheckedChange={(v) => setAllowPrivate(v === true)} />
                    {t('integrations.allowPrivate')}
                  </label>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testMut.isPending}
                  onClick={() => testMut.mutate(testUrl.trim() || undefined)}
                >
                  {t('integrations.test')}
                </Button>
              </div>
              <ConnectivityResult result={testResult} />
            </CardContent>
          </Card>
        </div>
      )}

      <WebhookRuleDialog
        open={editor != null}
        rule={editor === 'new' || editor == null ? null : editor}
        onOpenChange={(open) => !open && setEditor(null)}
        onSaved={async (effective) => {
          setLastEffective(effective)
          setEditor(null)
          await invalidate()
        }}
      />

      <AlertDialog open={removeUrl != null} onOpenChange={(open) => !open && setRemoveUrl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('webhooks.deleteUrlTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('webhooks.deleteUrlConfirm', { index: removeUrl })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteUrlMut.isPending} onClick={() => removeUrl != null && deleteUrlMut.mutate(removeUrl)}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeRule != null} onOpenChange={(open) => !open && setRemoveRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('webhooks.deleteRuleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('webhooks.deleteRuleConfirm', { hook: removeRule?.hook, index: removeRule?.index })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteRuleMut.isPending} onClick={() => removeRule && deleteRuleMut.mutate(removeRule)}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input className="w-28" type="number" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  )
}

function WebhookRuleDialog({
  open,
  rule,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  rule: WebhookRule | null
  onOpenChange: (open: boolean) => void
  onSaved: (effective: EffectiveMode) => Promise<void>
}) {
  const { t } = useTranslation()
  const [hook, setHook] = useState('message_publish')
  const [action, setAction] = useState('')
  const [topics, setTopics] = useState('')
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setHook(rule?.hook ?? 'message_publish')
    setAction(rule?.action ?? rule?.hook ?? 'message_publish')
    setTopics((rule?.topics ?? []).join('\n'))
    setUrls((rule?.urls ?? []).join('\n'))
  }, [open, rule])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: WebhookRule = {
      hook,
      action: action.trim() || hook,
    }
    const topicList = linesToList(topics)
    const urlList = linesToList(urls)
    if (topicList.length) body.topics = topicList
    if (urlList.length) body.urls = urlList
    setBusy(true)
    try {
      const result =
        rule?.hook != null && rule.index != null
          ? await endpoints.webhookRuleUpdate(rule.hook, rule.index, body)
          : await endpoints.webhookRuleAdd(body)
      toastWriteResult(result, rule ? 'webhooks.ruleUpdated' : 'webhooks.ruleAdded', t)
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
          <DialogTitle>{rule ? t('webhooks.editRule') : t('webhooks.addRule')}</DialogTitle>
          <DialogDescription>{t('webhooks.ruleHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('webhooks.hook')}</Label>
            <Select value={hook} onValueChange={setHook}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_HOOKS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('webhooks.action')}</Label>
            <Input className="font-mono text-xs" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('acl.topics')}</Label>
            <Textarea className="font-mono text-xs" rows={3} value={topics} onChange={(e) => setTopics(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('webhooks.ruleUrls')}</Label>
            <Textarea className="font-mono text-xs" rows={3} value={urls} onChange={(e) => setUrls(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
