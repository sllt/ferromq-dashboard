import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { diffHasChanges } from '@/lib/config'
import type { ConfigDiff } from '@/lib/types'

export function ConfigDiffView({
  diff,
  className,
  emptyHint,
}: {
  diff?: ConfigDiff | null
  className?: string
  emptyHint?: string
}) {
  const { t } = useTranslation()
  if (!diffHasChanges(diff)) {
    return <p className={cn('text-xs text-muted-foreground', className)}>{emptyHint ?? t('config.diffEmpty')}</p>
  }
  const rows: { kind: 'added' | 'removed' | 'changed'; path: string }[] = [
    ...(diff?.added ?? []).map((path) => ({ kind: 'added' as const, path })),
    ...(diff?.removed ?? []).map((path) => ({ kind: 'removed' as const, path })),
    ...(diff?.changed ?? []).map((path) => ({ kind: 'changed' as const, path })),
  ]
  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-medium">{t('config.diffTitle')}</div>
      <ul className="max-h-56 divide-y overflow-auto font-mono text-xs">
        {rows.map((row) => (
          <li key={`${row.kind}:${row.path}`} className="flex items-start gap-2 px-3 py-1.5">
            <span
              className={cn(
                'mt-0.5 shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase',
                row.kind === 'added' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                row.kind === 'removed' && 'bg-destructive/15 text-destructive',
                row.kind === 'changed' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
              )}
            >
              {t(`config.diff.${row.kind}`)}
            </span>
            <span className="break-all">{row.path}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
