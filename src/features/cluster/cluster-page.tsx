import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Network } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toastApiError } from '@/lib/api'
import { useCanWrite } from '@/lib/auth-store'
import { parseClusterTopology } from '@/lib/diagnostics'
import { endpoints } from '@/lib/endpoints'
import type { ClusterWriteResult } from '@/lib/types'

function modeLabel(mode: string, t: (key: string, opts?: { defaultValue?: string }) => string) {
  return t(`clusterPage.mode_${mode}`, { defaultValue: mode })
}

export function ClusterPage() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const qc = useQueryClient()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [writeResult, setWriteResult] = useState<ClusterWriteResult | null>(null)

  const q = useQuery({
    queryKey: ['cluster'],
    queryFn: endpoints.cluster,
    refetchInterval: 10_000,
  })

  const leaveMut = useMutation({
    mutationFn: () => endpoints.clusterLeave(),
    onSuccess: async (result) => {
      setWriteResult(result)
      if (result.ok) toast.success(t('clusterPage.leaveOk'))
      else toast.error(result.message ?? t('clusterPage.leaveFail'))
      await qc.invalidateQueries({ queryKey: ['cluster'] })
    },
    onError: toastApiError,
  })

  const topo = parseClusterTopology(q.data) ?? q.data
  const membership = topo?.membership
  const canLeave = canWrite && topo?.mode === 'raft' && membership?.leave === true

  return (
    <div>
      <PageHeader
        title={t('clusterPage.title')}
        description={t('clusterPage.desc')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/nodes">{t('clusterPage.openNodes')}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/plugins">{t('clusterPage.openPlugins')}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void q.refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      {q.isLoading ? (
        <PageSkeleton cards={3} rows={4} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : topo ? (
        <div className="space-y-4">
          {topo.note ? (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{topo.note}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label={t('clusterPage.mode')}>
              <Badge variant={topo.mode === 'raft' ? 'success' : 'secondary'}>{modeLabel(topo.mode, t)}</Badge>
            </InfoCard>
            <InfoCard label={t('clusterPage.plugin')}>
              <span className="font-mono text-sm">{topo.plugin ?? '—'}</span>
              {topo.plugin ? (
                <Badge variant={topo.plugin_active ? 'success' : 'secondary'} className="ml-2">
                  {topo.plugin_active ? t('clusterPage.pluginActive') : t('plugins.inactive')}
                </Badge>
              ) : null}
            </InfoCard>
            <InfoCard label={t('clusterPage.local')}>
              <span className="font-mono text-sm">{topo.local_node_id}</span>
              {topo.role ? <Badge variant="outline" className="ml-2">{topo.role}</Badge> : null}
            </InfoCard>
            <InfoCard label={t('clusterPage.leader')}>
              <span className="font-mono text-sm">{topo.leader_id ?? '—'}</span>
            </InfoCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="size-4 text-primary" />
                {t('clusterPage.members')}
              </CardTitle>
              <CardDescription>
                {t('clusterPage.peers')}: {(topo.peers ?? []).join(', ') || '—'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(topo.nodes ?? []).map((node) => (
                <div key={node.node_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <div className="font-mono text-sm">
                      {t('common.node')} {node.node_id}
                      {node.node_id === topo.local_node_id ? (
                        <span className="ml-2 text-xs text-muted-foreground">({t('clusterPage.local')})</span>
                      ) : null}
                    </div>
                    {node.error ? <div className="text-xs text-destructive">{node.error}</div> : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {node.role ? <Badge variant={node.leader ? 'success' : 'outline'}>{node.role}</Badge> : null}
                    <Badge variant={node.reachable === false ? 'destructive' : 'secondary'}>
                      {node.reachable === false ? t('clusterPage.unreachable') : t('clusterPage.reachable')}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('clusterPage.membership')}</CardTitle>
              <CardDescription>{membership?.reason ?? t('clusterPage.joinDisabled')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {t('clusterPage.joinSupported')}: {t('common.no')}
                </Badge>
                <Badge variant={membership?.leave ? 'success' : 'secondary'}>
                  {t('clusterPage.leaveSupported')}: {membership?.leave ? t('common.yes') : t('common.no')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled title={t('clusterPage.joinDisabled')}>
                  {t('clusterPage.join')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!canLeave || leaveMut.isPending}
                  title={
                    canLeave
                      ? t('clusterPage.leaveHint')
                      : !canWrite
                        ? t('auth.readonlyAction', { action: t('clusterPage.leave') })
                        : t('clusterPage.noRaft')
                  }
                  onClick={() => setConfirmLeave(true)}
                >
                  {t('clusterPage.leave')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('clusterPage.joinDisabled')}</p>
              {topo.mode !== 'raft' || membership?.leave !== true ? (
                <p className="text-xs text-muted-foreground">{t('clusterPage.noRaft')}</p>
              ) : null}
            </CardContent>
          </Card>

          {topo.raft != null && topo.raft !== null && typeof topo.raft === 'object' ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('clusterPage.raftStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-5">
                  {JSON.stringify(topo.raft, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          {writeResult ? <WriteResultCard result={writeResult} /> : null}
        </div>
      ) : null}

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clusterPage.leave')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clusterPage.leaveConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                leaveMut.mutate()
                setConfirmLeave(false)
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

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-1">{children}</CardContent>
    </Card>
  )
}

function WriteResultCard({ result }: { result: ClusterWriteResult }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('clusterPage.writeResult')}
          <Badge variant={result.ok ? 'success' : 'destructive'}>
            {result.ok ? t('audit.ok') : t('audit.fail')}
          </Badge>
        </CardTitle>
        {result.message ? <CardDescription>{result.message}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {(result.nodes ?? []).map((node, idx) => (
          <div key={`${node.node_id ?? idx}`} className="rounded-lg border px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono">
                {t('common.node')} {node.node_id ?? '—'}
              </span>
              <Badge variant={node.ok ? 'success' : 'destructive'}>{node.ok ? t('audit.ok') : t('audit.fail')}</Badge>
            </div>
            {node.error ? <p className="mt-1 text-destructive">{node.error}</p> : null}
            {node.result != null ? (
              <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-muted-foreground">
                {JSON.stringify(node.result, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
