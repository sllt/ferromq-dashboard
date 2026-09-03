import { Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function MissingPluginConfig({ plugin, hint }: { plugin: string; hint?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-center">
      <Inbox className="size-8 text-muted-foreground/70" />
      <div className="text-sm font-medium">{t('integrations.missingTitle')}</div>
      <p className="max-w-md text-xs text-muted-foreground">
        {hint ?? t('integrations.missingHint', { plugin })}
      </p>
    </div>
  )
}
