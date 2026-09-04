import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ConfirmSaveDialog } from '@/features/config/confirm-save-dialog'
import { ConfigDiffView } from '@/features/config/config-diff'
import { ConfigJsonEditor } from '@/features/config/config-json-editor'
import { ConfigVersions } from '@/features/config/config-versions'
import { EffectiveBadge } from '@/features/config/effective-badge'
import { toastApiError } from '@/lib/api'
import { useCanAdmin, useCanWrite } from '@/lib/auth-store'
import {
  countRedactedSecrets,
  isAclPlugin,
  isHttpApiPlugin,
  parseJsonObject,
  prettyJson,
  stripRedactedSecrets,
  validateResultFromError,
} from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import type { ConfigApplyMode, ConfigValidateResult, ConfigWriteResult, EffectiveMode } from '@/lib/types'

export function PluginConfigPage() {
  const { t } = useTranslation()
  const { nodeId, plugin } = useParams({ from: '/_authenticated/plugins/$nodeId/$plugin' })
  const node = Number(nodeId)
  const qc = useQueryClient()
  const canWrite = useCanWrite()
  const canAdmin = useCanAdmin()
  const httpApi = isHttpApiPlugin(plugin)
  const canEdit = httpApi ? canAdmin : canWrite
  const [reveal, setReveal] = useState(false)
  const [text, setText] = useState('')
  const [apply, setApply] = useState<ConfigApplyMode>('reload')
  const [preview, setPreview] = useState<ConfigValidateResult | null>(null)
  const [stripped, setStripped] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const enabled = Number.isFinite(node) && node >= 0 && Boolean(plugin)

  const configQ = useQuery({
    queryKey: ['plugin-config', node, plugin, reveal],
    queryFn: () => endpoints.pluginConfig(node, plugin, reveal),
    enabled,
  })
  const versionsQ = useQuery({
    queryKey: ['plugin-config-versions', node, plugin],
    queryFn: () => endpoints.pluginConfigVersions(node, plugin),
    enabled,
  })
  const pluginQ = useQuery({
    queryKey: ['plugin-info', node, plugin],
    queryFn: () => endpoints.plugin(node, plugin),
    enabled,
  })

  useEffect(() => {
    if (configQ.data !== undefined) setText(prettyJson(configQ.data))
  }, [configQ.data])

  const parsed = useMemo(() => parseJsonObject(text), [text])
  const redactedCount = parsed.ok ? countRedactedSecrets(parsed.value) : 0

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['plugin-config', node, plugin] }),
      qc.invalidateQueries({ queryKey: ['plugin-config-versions', node, plugin] }),
      qc.invalidateQueries({ queryKey: ['plugins'] }),
    ])
  }

  function onWriteResult(r: ConfigWriteResult, okKey: string) {
    setLastEffective(r.effective)
    if (r.apply_error) toast.error(r.apply_error)
    else toast.success(t(okKey))
    if (r.note) toast.message(r.note)
  }

  const validateMut = useMutation({
    mutationFn: async (confirm: boolean) => {
      if (!parsed.ok) throw new Error(t('config.jsonObject'))
      const redacted = countRedactedSecrets(parsed.value)
      const body = stripRedactedSecrets(parsed.value)
      try {
        const result = await endpoints.pluginConfigValidate(node, plugin, body, apply)
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
      const body = stripRedactedSecrets(parsed.value)
      return endpoints.pluginConfigUpdate(node, plugin, body, apply)
    },
    onSuccess: async (r) => {
      onWriteResult(r, 'config.saved')
      setConfirmOpen(false)
      await invalidate()
    },
    onError: toastApiError,
  })

  const rollbackMut = useMutation({
    mutationFn: (version: string) => endpoints.pluginConfigRollback(node, plugin, version, apply),
    onSuccess: async (r) => {
      onWriteResult(r, 'config.rolledBack')
      await invalidate()
    },
    onError: toastApiError,
  })

  if (!enabled) return <ErrorState error={new Error(t('config.badPlugin'))} />
  if (configQ.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (configQ.error) return <ErrorState error={configQ.error} onRetry={() => void configQ.refetch()} />

  return (
    <div>
      <PageHeader
        title={plugin}
        description={t('config.pluginDesc', { node, name: plugin })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/plugins">
                <ArrowLeft />
                {t('nav.plugins')}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void configQ.refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EffectiveBadge mode={lastEffective ?? (pluginQ.data?.immutable ? 'restart_required' : undefined)} />
        {pluginQ.data?.immutable ? (
          <span className="text-xs text-amber-700 dark:text-amber-300">{t('plugins.immutableHint')}</span>
        ) : null}
        {isAclPlugin(plugin) ? (
          <span className="rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground">
            {t('config.aclHint')}{' '}
            <Link to="/acl" className="underline underline-offset-2">
              {t('nav.acl')}
            </Link>
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{t('config.editor')}</div>
              <p className="text-xs text-muted-foreground">{t('config.editorHint')}</p>
            </div>
            {canAdmin ? (
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={reveal}
                  onCheckedChange={setReveal}
                  disabled={!canAdmin}
                />
                {reveal ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-destructive" />}
                {t('config.reveal')}
              </label>
            ) : (
              <span className="text-[11px] text-muted-foreground">{t('config.revealAdminOnly')}</span>
            )}
          </div>

          <ConfigJsonEditor value={text} onChange={setText} readOnly={!canEdit} />

          {canEdit ? (
            <div className="flex flex-wrap items-end gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('config.applyMode')}</Label>
                <Select value={apply} onValueChange={(v) => setApply(v as ConfigApplyMode)}>
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reload">{t('config.applyReload')}</SelectItem>
                    <SelectItem value="none">{t('config.applyNone')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <p className="text-xs text-muted-foreground">
              {httpApi ? t('config.httpApiAdminOnly') : t('config.viewerReadonly')}
            </p>
          )}
          {preview ? (
            <div className="space-y-2 border-t pt-3">
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
          canRollback={canEdit}
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
        warning={redactedCount > 0 && !reveal ? t('config.redactedSaveWarn') : undefined}
        busy={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
      />
    </div>
  )
}