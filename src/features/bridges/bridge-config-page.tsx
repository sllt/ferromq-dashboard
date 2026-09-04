import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmSaveDialog } from '@/features/config/confirm-save-dialog'
import { ConfigDiffView } from '@/features/config/config-diff'
import { ConfigJsonEditor } from '@/features/config/config-json-editor'
import { EffectiveBadge } from '@/features/config/effective-badge'
import { PluginStatusBadges } from '@/features/integrations/status-badges'
import { RevealToggle } from '@/features/integrations/reveal-toggle'
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import {
  asRecord,
  countRedactedSecrets,
  parseJsonObject,
  prettyJson,
  stripRedactedSecrets,
} from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import { toastWriteResult } from '@/lib/integrations'
import type { ConfigApplyMode, ConfigWriteResult, EffectiveMode } from '@/lib/types'

export function BridgeConfigPage() {
  const { t } = useTranslation()
  const { plugin } = useParams({ from: '/_authenticated/bridges/$plugin' })
  const qc = useQueryClient()
  const canWrite = useCanWrite()
  const [reveal, setReveal] = useState(false)
  const [text, setText] = useState('{}')
  const [apply, setApply] = useState<ConfigApplyMode>('reload')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const detailQ = useQuery({
    queryKey: ['bridge', plugin, reveal],
    queryFn: () => endpoints.bridge(plugin, reveal),
    enabled: Boolean(plugin),
  })

  useEffect(() => {
    if (detailQ.data?.config !== undefined) setText(prettyJson(asRecord(detailQ.data.config)))
  }, [detailQ.data])

  const parsed = useMemo(() => parseJsonObject(text), [text])
  const redactedCount = parsed.ok ? countRedactedSecrets(parsed.value) : 0

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['bridge', plugin] }),
      qc.invalidateQueries({ queryKey: ['bridges'] }),
    ])
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!parsed.ok) throw new Error(t('config.jsonObject'))
      return endpoints.bridgeUpdate(plugin, stripRedactedSecrets(parsed.value), apply)
    },
    onSuccess: async (r: ConfigWriteResult) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'config.saved', t)
      setConfirmOpen(false)
      await invalidate()
    },
    onError: toastApiError,
  })

  const loadMut = useMutation({
    mutationFn: () => endpoints.bridgeLoad(plugin),
    onSuccess: async () => {
      toast.success(t('plugins.loaded'))
      await invalidate()
    },
    onError: toastApiError,
  })
  const unloadMut = useMutation({
    mutationFn: () => endpoints.bridgeUnload(plugin),
    onSuccess: async () => {
      toast.success(t('plugins.unloaded'))
      await invalidate()
    },
    onError: toastApiError,
  })

  if (!plugin) return <ErrorState error={new Error(t('bridges.badPlugin'))} />
  if (detailQ.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (detailQ.error) return <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} />

  const detail = detailQ.data

  return (
    <div>
      <PageHeader
        title={plugin}
        description={t('bridges.configDesc', { name: plugin })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/bridges">
                <ArrowLeft />
                {t('nav.bridges')}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void detailQ.refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PluginStatusBadges status={detail} />
        {detail?.kind?.direction ? <Badge variant="outline">{detail.kind.direction}</Badge> : null}
        {detail?.kind?.transport ? <Badge variant="outline">{detail.kind.transport}</Badge> : null}
        <EffectiveBadge mode={lastEffective} />
      </div>
      {detail?.note ? <p className="mb-4 text-xs text-muted-foreground">{detail.note}</p> : null}

      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t('config.editor')}</div>
            <p className="text-xs text-muted-foreground">{t('config.editorHint')}</p>
          </div>
          <RevealToggle reveal={reveal} onRevealChange={setReveal} />
        </div>

        <ConfigJsonEditor value={text} onChange={setText} readOnly={!canWrite} />

        {canWrite ? (
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
            <Button type="button" disabled={!parsed.ok || saveMut.isPending} onClick={() => setConfirmOpen(true)}>
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={detail?.immutable || detail?.active || !detail?.available}
              onClick={() => loadMut.mutate()}
            >
              {t('plugins.load')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={detail?.immutable || !detail?.active}
              onClick={() => unloadMut.mutate()}
            >
              {t('plugins.unload')}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('config.viewerReadonly')}</p>
        )}
        {redactedCount > 0 && !reveal ? (
          <p className="text-xs text-amber-800 dark:text-amber-300">{t('config.redactedSaveWarn')}</p>
        ) : null}
        {saveMut.data ? <ConfigDiffView diff={saveMut.data.diff} /> : null}
      </div>

      <ConfirmSaveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        result={
          parsed.ok
            ? {
                ok: true,
                valid: true,
                effective: lastEffective ?? 'reload',
                diff: {},
                note: t('bridges.saveHint'),
              }
            : null
        }
        stripped={redactedCount}
        warning={redactedCount > 0 && !reveal ? t('config.redactedSaveWarn') : undefined}
        busy={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
      />
    </div>
  )
}
