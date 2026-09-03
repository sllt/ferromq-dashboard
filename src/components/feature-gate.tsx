import { Link } from '@tanstack/react-router'
import { ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { FeatureKey } from '@/lib/features'

export function FeatureUnavailable({ feature }: { feature: FeatureKey }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <ShieldOff className="size-8 text-muted-foreground/70" />
      <div className="text-sm font-medium">{t('features.unavailableTitle')}</div>
      <p className="max-w-md text-xs text-muted-foreground">
        {t('features.unavailableHint', { feature: t(`nodes.${feature}`) })}
      </p>
      <Button asChild size="sm" variant="outline">
        <Link to="/">{t('nav.overview')}</Link>
      </Button>
    </div>
  )
}
