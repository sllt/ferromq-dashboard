import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfigDiffView } from '@/features/config/config-diff'
import { EffectiveBadge } from '@/features/config/effective-badge'
import type { ConfigValidateResult, EffectiveMode } from '@/lib/types'

export function ConfirmSaveDialog({
  open,
  onOpenChange,
  result,
  warning,
  stripped,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result?: ConfigValidateResult | null
  warning?: string
  stripped?: number
  busy?: boolean
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const effective: EffectiveMode | undefined = result?.effective
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('config.confirmTitle')}</DialogTitle>
          <DialogDescription>{t('config.confirmHint')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <EffectiveBadge mode={effective} />
            {result?.valid === false ? (
              <span className="text-xs text-destructive">{t('config.invalid')}</span>
            ) : null}
          </div>
          {result?.note ? <p className="text-xs text-muted-foreground">{result.note}</p> : null}
          {warning ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              {warning}
            </div>
          ) : null}
          {stripped ? <p className="text-xs text-muted-foreground">{t('config.strippedSecrets', { count: stripped })}</p> : null}
          {result?.errors && result.errors.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-xs text-destructive">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <ConfigDiffView diff={result?.diff} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={busy || result?.valid === false}
              onClick={onConfirm}
            >
              {busy ? t('common.loading') : t('config.saveConfirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
