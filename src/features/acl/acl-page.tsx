import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
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
import { PluginStatusBadges } from '@/features/integrations/status-badges'
import { RevealToggle } from '@/features/integrations/reveal-toggle'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { REDACTED } from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import {
  formatWho,
  parseAclWho,
  parseTopicsText,
  sanitizeAclWho,
  toastWriteResult,
  topicsToText,
} from '@/lib/integrations'
import type { AclAccess, AclControl, AclRule, AclRuleInput, AclWhoObject, EffectiveMode } from '@/lib/types'
import { ACL_CONTROLS } from '@/lib/types'

export function AclPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()
  const [reveal, setReveal] = useState(false)
  const [editor, setEditor] = useState<AclRule | 'new' | null>(null)
  const [remove, setRemove] = useState<AclRule | null>(null)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)
  const [disconnect, setDisconnect] = useState(true)
  const [priority, setPriority] = useState('10')

  const overviewQ = useQuery({
    queryKey: ['acl', reveal],
    queryFn: () => endpoints.acl(reveal),
  })

  const overview = overviewQ.data
  const rules = overview?.rules ?? []

  useEffect(() => {
    if (!overview) return
    setDisconnect(overview.disconnect_if_pub_rejected !== false)
    setPriority(String(overview.priority ?? 10))
  }, [overview])

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: ['acl'] })
  }

  const settingsMut = useMutation({
    mutationFn: () =>
      endpoints.aclUpdate({
        disconnect_if_pub_rejected: disconnect,
        priority: Number(priority) || 0,
      }),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'acl.settingsSaved', t)
      await invalidate()
    },
    onError: toastApiError,
  })

  const deleteMut = useMutation({
    mutationFn: (index: number) => endpoints.aclRuleDelete(index),
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'acl.deleted', t)
      setRemove(null)
      await invalidate()
    },
    onError: toastApiError,
  })

  const columns = useMemo<ColumnDef<AclRule>[]>(
    () => [
      { accessorKey: 'index', header: '#', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      {
        accessorKey: 'access',
        header: t('acl.access'),
        cell: ({ getValue }) => {
          const access = String(getValue())
          return <Badge variant={access === 'allow' ? 'success' : 'destructive'}>{t(`acl.${access}`)}</Badge>
        },
      },
      {
        accessorKey: 'who',
        header: t('acl.who'),
        cell: ({ getValue }) => <span className="block max-w-xs truncate font-mono text-xs">{formatWho(getValue())}</span>,
      },
      {
        accessorKey: 'control',
        header: t('acl.control'),
        cell: ({ getValue }) => <Badge variant="outline">{String(getValue() || 'all')}</Badge>,
      },
      {
        accessorKey: 'topics',
        header: t('acl.topics'),
        cell: ({ row }) => (
          <span className="block max-w-xs truncate font-mono text-xs">
            {topicsToText(row.original.topics) || '—'}
          </span>
        ),
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

  return (
    <div>
      <PageHeader
        title={t('acl.title')}
        description={t('acl.desc')}
        actions={
          <>
            <RevealToggle reveal={reveal} onRevealChange={setReveal} />
            <Button size="sm" variant="outline" onClick={() => void overviewQ.refetch()}>
              {t('common.refresh')}
            </Button>
            {canWrite ? (
              <Button size="sm" onClick={() => setEditor('new')}>
                {t('acl.add')}
              </Button>
            ) : null}
          </>
        }
      />

      {overviewQ.isLoading ? (
        <TableSkeleton />
      ) : overviewQ.error ? (
        <ErrorState error={overviewQ.error} onRetry={() => void overviewQ.refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <PluginStatusBadges status={overview} />
            <EffectiveBadge mode={lastEffective} />
          </div>
          {overview?.note ? <p className="text-xs text-muted-foreground">{overview.note}</p> : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('acl.settings')}</CardTitle>
              <CardDescription>{t('acl.settingsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={disconnect} onCheckedChange={setDisconnect} disabled={!canWrite} />
                {t('acl.disconnectRejected')}
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="acl-priority">{t('acl.priority')}</Label>
                <Input
                  id="acl-priority"
                  className="w-28"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={!canWrite}
                />
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

          <DataTable columns={columns} data={rules} searchPlaceholder={t('acl.search')} />
        </div>
      )}

      <AclRuleDialog
        open={editor != null}
        rule={editor === 'new' || editor == null ? null : editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onSaved={async (effective) => {
          setLastEffective(effective)
          setEditor(null)
          await invalidate()
        }}
      />

      <AlertDialog open={remove != null} onOpenChange={(open) => !open && setRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('acl.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('acl.deleteConfirm', { index: remove?.index })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending || remove == null}
              onClick={() => remove && deleteMut.mutate(remove.index)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AclRuleDialog({
  open,
  rule,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  rule: AclRule | null
  onOpenChange: (open: boolean) => void
  onSaved: (effective: EffectiveMode) => Promise<void>
}) {
  const { t } = useTranslation()
  const [access, setAccess] = useState<AclAccess>('allow')
  const [whoAll, setWhoAll] = useState(true)
  const [who, setWho] = useState<AclWhoObject>({})
  const [control, setControl] = useState<AclControl>('all')
  const [topics, setTopics] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!rule) {
      setAccess('allow')
      setWhoAll(true)
      setWho({})
      setControl('all')
      setTopics('')
      return
    }
    setAccess(rule.access === 'deny' ? 'deny' : 'allow')
    const parsed = parseAclWho(rule.who)
    if (parsed === 'all') {
      setWhoAll(true)
      setWho({})
    } else {
      setWhoAll(false)
      setWho(parsed)
    }
    const nextControl = ACL_CONTROLS.includes(rule.control as AclControl)
      ? (rule.control as AclControl)
      : 'all'
    setControl(nextControl)
    setTopics(topicsToText(rule.topics))
  }, [open, rule])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: AclRuleInput = {
      access,
      who: whoAll ? 'all' : sanitizeAclWho(who),
      control,
    }
    const parsedTopics = parseTopicsText(topics)
    if (parsedTopics.length) body.topics = parsedTopics
    setBusy(true)
    try {
      const result = rule
        ? await endpoints.aclRuleUpdate(rule.index, body)
        : await endpoints.aclRuleAdd(body)
      toastWriteResult(result, rule ? 'acl.updated' : 'acl.created', t)
      await onSaved(result.effective)
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
    }
  }

  function patchWho(next: Partial<AclWhoObject>) {
    setWho((prev) => ({ ...prev, ...next }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? t('acl.edit') : t('acl.add')}</DialogTitle>
          <DialogDescription>{t('acl.formHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('acl.access')}</Label>
              <Select value={access} onValueChange={(v) => setAccess(v as AclAccess)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">{t('acl.allow')}</SelectItem>
                  <SelectItem value="deny">{t('acl.deny')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('acl.control')}</Label>
              <Select value={control} onValueChange={(v) => setControl(v as AclControl)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACL_CONTROLS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`acl.control_${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={whoAll} onCheckedChange={(v) => setWhoAll(v === true)} />
            {t('acl.whoAll')}
          </label>

          {!whoAll ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('common.username')} value={who.user ?? ''} onChange={(v) => patchWho({ user: v })} />
              <Field
                label={t('auth.password')}
                type="password"
                value={who.password ?? ''}
                placeholder={REDACTED}
                onChange={(v) => patchWho({ password: v })}
              />
              <Field label={t('common.client')} value={who.clientid ?? ''} onChange={(v) => patchWho({ clientid: v })} />
              <Field label={t('acl.ipaddr')} value={who.ipaddr ?? ''} onChange={(v) => patchWho({ ipaddr: v })} />
              <div className="space-y-1.5">
                <Label>{t('acl.protocol')}</Label>
                <Select
                  value={who.protocol != null ? String(who.protocol) : 'none'}
                  onValueChange={(v) => patchWho({ protocol: v === 'none' ? undefined : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.optional')}</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <Checkbox
                  checked={who.superuser === true}
                  onCheckedChange={(v) => patchWho({ superuser: v === true })}
                />
                {t('acl.superuser')}
              </label>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="acl-topics">{t('acl.topics')}</Label>
            <Textarea
              id="acl-topics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder={t('acl.topicsHint')}
            />
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
