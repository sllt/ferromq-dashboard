import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatUnixTime } from '@/lib/session-user'
import { formatBytes } from '@/lib/utils'
import type { ConfigVersion } from '@/lib/types'

export function ConfigVersions({
  versions,
  canRollback,
  busy,
  onRollback,
}: {
  versions?: ConfigVersion[]
  canRollback: boolean
  busy?: boolean
  onRollback: (version: string) => void
}) {
  const { t } = useTranslation()
  const items = versions ?? []
  return (
    <div className="rounded-xl border">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-medium">{t('config.versions')}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('config.versionsHint')}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t('config.noVersions')}</p>
      ) : (
        <ul className="divide-y">
          {items.map((v) => (
            <li key={v.version} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs">{v.version}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatUnixTime(v.ts)} · {formatBytes(v.size)}
                </div>
              </div>
              {canRollback ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onRollback(v.version)}
                >
                  {t('config.rollback')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
