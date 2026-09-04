import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

type Status = {
  available?: boolean
  active?: boolean
  inited?: boolean
  reloadable?: boolean | null
  immutable?: boolean
}

export function PluginStatusBadges({ status }: { status?: Status | null }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={status.available ? 'success' : 'secondary'}>
        {status.available ? t('integrations.available') : t('integrations.unavailable')}
      </Badge>
      <Badge variant={status.active ? 'success' : 'secondary'}>
        {status.active ? t('plugins.active') : t('plugins.inactive')}
      </Badge>
      {status.inited ? <Badge variant="outline">{t('plugins.inited')}</Badge> : null}
      {status.reloadable ? <Badge variant="default">{t('integrations.reloadable')}</Badge> : null}
      {status.immutable ? <Badge variant="warning">{t('plugins.immutable')}</Badge> : null}
    </div>
  )
}
