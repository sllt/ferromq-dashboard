import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ConnectivityTest } from '@/lib/types'

export function ConnectivityResult({ result }: { result?: ConnectivityTest | null }) {
  const { t } = useTranslation()
  if (!result) return null
  return (
    <div className="space-y-2 rounded-lg border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={result.ok ? 'success' : 'destructive'}>
          {result.ok ? t('integrations.testOk') : t('integrations.testFail')}
        </Badge>
        {result.kind ? <Badge variant="outline">{result.kind}</Badge> : null}
        {result.latency_ms != null ? (
          <span className="text-[11px] text-muted-foreground">
            {t('integrations.latency', { ms: result.latency_ms })}
          </span>
        ) : null}
      </div>
      {result.url ? <p className="break-all font-mono text-xs">{result.url}</p> : null}
      {result.host ? (
        <p className="text-[11px] text-muted-foreground">
          {result.host}
          {result.port != null ? `:${result.port}` : ''}
        </p>
      ) : null}
      {result.error ? <p className="text-xs text-destructive">{result.error}</p> : null}
      {result.note ? <p className="text-xs text-muted-foreground">{result.note}</p> : null}
    </div>
  )
}
