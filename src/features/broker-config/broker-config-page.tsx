import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmSaveDialog } from '@/features/config/confirm-save-dialog'
import { ConfigDiffView } from '@/features/config/config-diff'
import { ConfigJsonEditor } from '@/features/config/config-json-editor'
import { ConfigVersions } from '@/features/config/config-versions'
import { EffectiveBadge } from '@/features/config/effective-badge'
import { toastApiError } from '@/lib/api'
import { useCanAdmin } from '@/lib/auth-store'
import {
  asRecord,
  BROKER_SECTIONS,
  countRedactedSecrets,
  parseJsonObject,
  prettyJson,
  stripRedactedSecrets,
  validateResultFromError,
} from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import type {
  BrokerConfigSection,
  ConfigValidateResult,
  ConfigWriteResult,
  EffectiveMode,
} from '@/lib/types'

const LOG_TO = ['off', 'file', 'console', 'both'] as const
const LOG_LEVEL = ['trace', 'debug', 'info', 'warn', 'error'] as const

export function BrokerConfigPage({ initialSection }: { initialSection?: BrokerConfigSection }) {
  const { t } = useTranslation()
  const canAdmin = useCanAdmin()
  const qc = useQueryClient()
  const [reveal, setReveal] = useState(false)
  const [section, setSection] = useState<BrokerConfigSection>(initialSection ?? 'mqtt')
  const [text, setText] = useState('{}')
  const [advanced, setAdvanced] = useState(false)
  const [preview, setPreview] = useState<ConfigValidateResult | null>(null)
  const [stripped, setStripped] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const overviewQ = useQuery({
    queryKey: ['broker-config', reveal],
    queryFn: () => endpoints.brokerConfig(reveal),
  })
  const versionsQ = useQuery({
    queryKey: ['broker-config-versions'],
    queryFn: () => endpoints.brokerConfigVersions(),
  })

  useEffect(() => {
    if (!initialSection) return
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    if (!overviewQ.data) return
    const raw = overviewQ.data[section]
    setText(prettyJson(asRecord(raw)))
  }, [overviewQ.data, section])

  const parsed = useMemo(() => parseJsonObject(text), [text])
  const obj = parsed.ok ? parsed.value : {}
  const redactedCount = parsed.ok ? countRedactedSecrets(parsed.value) : 0

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['broker-config'] }),
      qc.invalidateQueries({ queryKey: ['broker-config-versions'] }),
    ])
  }

  function onWriteResult(r: ConfigWriteResult, okKey: string) {
    setLastEffective(r.effective)
    toast.success(t(okKey))
    if (r.note) toast.message(r.note)
    if (r.apply_error) toast.error(r.apply_error)
  }

  const validateMut = useMutation({
    mutationFn: async (confirm: boolean) => {
      if (!parsed.ok) throw new Error(t('config.jsonObject'))
      const redacted = countRedactedSecrets(parsed.value)
      const body = stripRedactedSecrets(parsed.value)
      try {
        const result = await endpoints.brokerConfigSectionValidate(section, body)
        return { result, stripped: redacted, confirm }
      } catch (e) {
        const fromErr = validateResultFromError(e)
        if (fromErr) return { result: fromErr, stripped: redacted, confirm }
        throw e
      }
    },
    onSuccess: ({ result, stripped: n, confirm }) => {
      setPreview(result)
      setStripped(n)
      if (!result.valid) {
        toast.error(result.errors?.[0] ?? t('config.invalid'))
        return
      }
      toast.success(t('config.valid'))
      if (confirm) setConfirmOpen(true)
    },
    onError: toastApiError,
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!parsed.ok) throw new Error(t('config.jsonObject'))
      return endpoints.brokerConfigSectionUpdate(section, stripRedactedSecrets(parsed.value))
    },
    onSuccess: async (r) => {
      onWriteResult(r, 'config.saved')
      setConfirmOpen(false)
      await invalidate()
    },
    onError: toastApiError,
  })

  const rollbackMut = useMutation({
    mutationFn: (version: string) => endpoints.brokerConfigRollback(version),
    onSuccess: async (r) => {
      onWriteResult(r, 'config.rolledBack')
      await invalidate()
    },
    onError: toastApiError,
  })

  function patch(next: Record<string, unknown>) {
    setText(prettyJson(next))
  }

  if (overviewQ.isLoading) return <PageSkeleton cards={3} rows={4} />
  if (overviewQ.error) return <ErrorState error={overviewQ.error} onRetry={() => void overviewQ.refetch()} />

  const overview = overviewQ.data
  const writeable = canAdmin

  return (
    <div>
      <PageHeader
        title={t('brokerConfig.title')}
        description={t('brokerConfig.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void overviewQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-medium">{t('brokerConfig.restartTitle')}</div>
          <p className="mt-0.5 text-xs opacity-90">{overview?.note ?? t('brokerConfig.restartHint')}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('brokerConfig.file')}</CardDescription>
            <CardTitle className="truncate font-mono text-sm">{overview?.file ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('config.effectiveLabel')}</CardDescription>
            <CardTitle className="text-sm">
              <EffectiveBadge mode={lastEffective ?? overview?.effective ?? 'restart_required'} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('brokerConfig.sections')}</CardDescription>
            <CardTitle className="text-sm">
              {(overview?.writable_sections ?? BROKER_SECTIONS).join(' · ')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!canAdmin ? (
        <p className="mb-4 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {t('brokerConfig.readHint')}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium">{t('brokerConfig.editSection')}</div>
            {canAdmin ? (
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={reveal} onCheckedChange={setReveal} />
                {reveal ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-destructive" />}
                {t('config.reveal')}
              </label>
            ) : (
              <span className="text-[11px] text-muted-foreground">{t('config.revealAdminOnly')}</span>
            )}
          </div>

          <Tabs value={section} onValueChange={(v) => setSection(v as BrokerConfigSection)}>
            <TabsList>
              {BROKER_SECTIONS.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(`brokerConfig.section.${s}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {BROKER_SECTIONS.map((s) => (
              <TabsContent key={s} value={s} className="space-y-4">
                {s !== 'listener' && !advanced ? (
                  <SectionForm
                    section={s}
                    value={obj}
                    readOnly={!writeable}
                    onChange={patch}
                  />
                ) : null}
                {s !== 'listener' ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={advanced} onCheckedChange={setAdvanced} />
                    {t('brokerConfig.advancedJson')}
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('brokerConfig.listenerHint')}</p>
                )}
                {advanced || s === 'listener' ? (
                  <ConfigJsonEditor value={text} onChange={setText} readOnly={!writeable} />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>

          {writeable ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={!parsed.ok || validateMut.isPending}
                onClick={() => validateMut.mutate(false)}
              >
                {t('config.validate')}
              </Button>
              <Button
                type="button"
                disabled={!parsed.ok || validateMut.isPending || saveMut.isPending}
                onClick={() => validateMut.mutate(true)}
              >
                {t('common.save')}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{t('config.viewerReadonly')}</p>
          )}
          {preview ? (
            <div className="mt-4 space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <EffectiveBadge mode={preview.effective} />
                {preview.note ? <span className="text-xs text-muted-foreground">{preview.note}</span> : null}
              </div>
              <ConfigDiffView diff={preview.diff} />
            </div>
          ) : null}
        </div>

        <ConfigVersions
          versions={Array.isArray(versionsQ.data) ? versionsQ.data : []}
          canRollback={canAdmin}
          busy={rollbackMut.isPending}
          onRollback={(version) => {
            if (window.confirm(t('config.rollbackConfirm', { version }))) {
              rollbackMut.mutate(version)
            }
          }}
        />
      </div>

      <ConfirmSaveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        result={preview}
        stripped={stripped}
        warning={t('brokerConfig.restartHint')}
        busy={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
      />
      {redactedCount > 0 && reveal === false ? (
        <p className="mt-3 text-xs text-muted-foreground">{t('config.redactedSaveWarn')}</p>
      ) : null}
    </div>
  )
}

function SectionForm({
  section,
  value,
  readOnly,
  onChange,
}: {
  section: BrokerConfigSection
  value: Record<string, unknown>
  readOnly?: boolean
  onChange: (next: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  if (section === 'mqtt') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          id="max_sessions"
          label={t('brokerConfig.mqtt.maxSessions')}
          value={value.max_sessions}
          readOnly={readOnly}
          onChange={(n) => onChange({ ...value, max_sessions: n })}
        />
        <NumberField
          id="delayed_publish_max"
          label={t('brokerConfig.mqtt.delayedMax')}
          value={value.delayed_publish_max}
          readOnly={readOnly}
          onChange={(n) => onChange({ ...value, delayed_publish_max: n })}
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Switch
            checked={value.delayed_publish_immediate === true}
            disabled={readOnly}
            onCheckedChange={(v) => onChange({ ...value, delayed_publish_immediate: v })}
          />
          {t('brokerConfig.mqtt.delayedImmediate')}
        </label>
      </div>
    )
  }
  if (section === 'log') {
    const to = typeof value.to === 'string' ? value.to : 'file'
    const level = typeof value.level === 'string' ? value.level : 'info'
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('brokerConfig.log.to')}</Label>
          <Select value={to} onValueChange={(v) => onChange({ ...value, to: v })} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_TO.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('brokerConfig.log.level')}</Label>
          <Select value={level} onValueChange={(v) => onChange({ ...value, level: v })} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_LEVEL.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('brokerConfig.log.dir')}</Label>
          <Input
            value={typeof value.dir === 'string' ? value.dir : ''}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...value, dir: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('brokerConfig.log.file')}</Label>
          <Input
            value={typeof value.file === 'string' ? value.file : ''}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...value, file: e.target.value })}
          />
        </div>
      </div>
    )
  }
  return null
}

function NumberField({
  id,
  label,
  value,
  readOnly,
  onChange,
}: {
  id: string
  label: string
  value: unknown
  readOnly?: boolean
  onChange: (n: number | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={typeof value === 'number' ? String(value) : ''}
        readOnly={readOnly}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? undefined : Number(raw))
        }}
      />
    </div>
  )
}
