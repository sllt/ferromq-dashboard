import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { useCanAdmin } from '@/lib/auth-store'

export function RevealToggle({
  reveal,
  onRevealChange,
}: {
  reveal: boolean
  onRevealChange: (next: boolean) => void
}) {
  const { t } = useTranslation()
  const canAdmin = useCanAdmin()
  if (!canAdmin) {
    return <span className="text-[11px] text-muted-foreground">{t('config.revealAdminOnly')}</span>
  }
  return (
    <label className="flex items-center gap-2 text-xs">
      <Switch checked={reveal} onCheckedChange={onRevealChange} />
      {reveal ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-destructive" />}
      {t('config.reveal')}
    </label>
  )
}
