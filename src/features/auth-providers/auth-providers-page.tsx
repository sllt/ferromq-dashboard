import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigJsonEditor } from '@/features/config/config-json-editor'
import { EffectiveBadge } from '@/features/config/effective-badge'
import { ConnectivityResult } from '@/features/integrations/connectivity-result'
import { PluginStatusBadges } from '@/features/integrations/status-badges'
import { RevealToggle } from '@/features/integrations/reveal-toggle'
import { toastApiError } from '@/lib/api'
import { useCanAdmin, useCanWrite } from '@/lib/auth-store'
import { asRecord, countRedactedSecrets, parseJsonObject, prettyJson, stripRedactedSecrets } from '@/lib/config'
import { endpoints } from '@/lib/endpoints'
import { setNested, stringAt, toastWriteResult } from '@/lib/integrations'
import type { AuthProviderDetail, ConnectivityTest, EffectiveMode } from '@/lib/types'

const PROVIDERS = [
  { key: 'http', name: 'ferromq-auth-http' },
  { key: 'jwt', name: 'ferromq-auth-jwt' },
] as const

export function AuthProvidersPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<string>('http')
  const [reveal, setReveal] = useState(false)

  const listQ = useQuery({
    queryKey: ['auth-providers'],
    queryFn: endpoints.authProviders,
  })

  return (
    <div>
      <PageHeader
        title={t('authProviders.title')}
        description={t('authProviders.desc')}
        actions={
          <>
            <RevealToggle reveal={reveal} onRevealChange={setReveal} />
            <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />
      {listQ.data?.note ? <p className="mb-4 text-xs text-muted-foreground">{listQ.data.note}</p> : null}
      {listQ.isLoading ? (
        <PageSkeleton cards={2} rows={4} />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {PROVIDERS.map((p) => {
              const info = listQ.data?.providers?.find((x) => x.kind === p.key || x.name === p.name)
              return (
                <Card key={p.key} className={tab === p.key ? 'ring-1 ring-primary/40' : undefined}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{t(`authProviders.kind_${p.key}`)}</span>
                      <Badge variant="outline">{p.name}</Badge>
                    </CardTitle>
                    <CardDescription>{t(`authProviders.kindHint_${p.key}`)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2">
                    <PluginStatusBadges status={info} />
                    <Button size="sm" variant="secondary" onClick={() => setTab(p.key)}>
                      {t('authProviders.configure')}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="http">{t('authProviders.kind_http')}</TabsTrigger>
              <TabsTrigger value="jwt">{t('authProviders.kind_jwt')}</TabsTrigger>
            </TabsList>
            <TabsContent value="http">
              <AuthProviderEditor name="http" reveal={reveal} />
            </TabsContent>
            <TabsContent value="jwt">
              <AuthProviderEditor name="jwt" reveal={reveal} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function AuthProviderEditor({ name, reveal }: { name: string; reveal: boolean }) {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const canAdmin = useCanAdmin()
  const qc = useQueryClient()
  const [text, setText] = useState('{}')
  const [testUrl, setTestUrl] = useState('')
  const [allowPrivate, setAllowPrivate] = useState(false)
  const [testResult, setTestResult] = useState<ConnectivityTest | null>(null)
  const [lastEffective, setLastEffective] = useState<EffectiveMode | null>(null)

  const detailQ = useQuery({
    queryKey: ['auth-provider', name, reveal],
    queryFn: () => endpoints.authProvider(name, reveal),
  })

  useEffect(() => {
    if (detailQ.data?.config) setText(prettyJson(asRecord(detailQ.data.config)))
  }, [detailQ.data])

  const parsed = useMemo(() => parseJsonObject(text), [text])
  const obj = parsed.ok ? parsed.value : {}
  const redactedCount = parsed.ok ? countRedactedSecrets(parsed.value) : 0

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!parsed.ok) throw new Error(t('config.jsonObject'))
      return endpoints.authProviderUpdate(name, stripRedactedSecrets(parsed.value))
    },
    onSuccess: async (r) => {
      setLastEffective(r.effective)
      toastWriteResult(r, 'config.saved', t)
      await qc.invalidateQueries({ queryKey: ['auth-provider', name] })
      await qc.invalidateQueries({ queryKey: ['auth-providers'] })
    },
    onError: toastApiError,
  })

  const testMut = useMutation({
    mutationFn: () => endpoints.authProviderTest(name, testUrl.trim() ? { url: testUrl.trim() } : {}, allowPrivate),
    onSuccess: (r) => setTestResult(r),
    onError: toastApiError,
  })

  if (detailQ.isLoading) return <PageSkeleton cards={1} rows={3} />
  if (detailQ.error) return <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} />

  const detail = detailQ.data as AuthProviderDetail | undefined

  function patchField(path: string, value: string) {
    if (!parsed.ok) return
    const next = { ...parsed.value }
    setNested(next, path, value)
    setText(prettyJson(next))
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{detail?.name ?? name}</div>
          <p className="text-xs text-muted-foreground">{detail?.note ?? t('authProviders.editorHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PluginStatusBadges status={detail} />
          <EffectiveBadge mode={lastEffective} />
        </div>
      </div>

      {name === 'http' || detail?.kind === 'http' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('authProviders.authUrl')}</Label>
            <Input
              className="font-mono text-xs"
              value={stringAt(obj, 'http_auth_req.url')}
              onChange={(e) => patchField('http_auth_req.url', e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('authProviders.aclUrl')}</Label>
            <Input
              className="font-mono text-xs"
              value={stringAt(obj, 'http_acl_req.url')}
              onChange={(e) => patchField('http_acl_req.url', e.target.value)}
              disabled={!canWrite}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('authProviders.encrypt')}</Label>
            <Select
              value={stringAt(obj, 'encrypt') || 'hmac-based'}
              onValueChange={(v) => patchField('encrypt', v)}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hmac-based">hmac-based</SelectItem>
                <SelectItem value="public-key">public-key</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(stringAt(obj, 'encrypt') || 'hmac-based') === 'public-key' ? (
            <div className="space-y-1.5">
              <Label>{t('authProviders.publicKey')}</Label>
              <Input
                className="font-mono text-xs"
                value={stringAt(obj, 'public_key')}
                onChange={(e) => patchField('public_key', e.target.value)}
                disabled={!canWrite}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t('authProviders.hmacSecret')}</Label>
              <Input
                type="password"
                className="font-mono text-xs"
                value={stringAt(obj, 'hmac_secret')}
                onChange={(e) => patchField('hmac_secret', e.target.value)}
                disabled={!canWrite}
              />
            </div>
          )}
        </div>
      )}

      <ConfigJsonEditor value={text} onChange={setText} readOnly={!canWrite} minRows={12} />
      {redactedCount > 0 && !reveal ? (
        <p className="text-xs text-amber-800 dark:text-amber-300">{t('config.redactedSaveWarn')}</p>
      ) : null}

      {canWrite ? (
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          {name === 'http' || detail?.kind === 'http' ? (
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label>{t('authProviders.testUrl')}</Label>
              <Input
                className="font-mono text-xs"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder={t('authProviders.testUrlHint')}
              />
            </div>
          ) : null}
          {canAdmin ? (
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={allowPrivate} onCheckedChange={(v) => setAllowPrivate(v === true)} />
              {t('integrations.allowPrivate')}
            </label>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            {t('integrations.test')}
          </Button>
          <Button type="button" disabled={!parsed.ok || saveMut.isPending} onClick={() => saveMut.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('config.viewerReadonly')}</p>
      )}
      <ConnectivityResult result={testResult} />
    </div>
  )
}
