import { ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function WriteUnavailable({ action }: { action?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <ShieldOff className="size-8 text-muted-foreground/70" />
      <div className="text-sm font-medium">{t('auth.readonlyTitle')}</div>
      <p className="max-w-md text-xs text-muted-foreground">
        {action ? t('auth.readonlyAction', { action }) : t('auth.readonlyHint')}
      </p>
      <Button asChild size="sm" variant="outline">
        <Link to="/">{t('nav.overview')}</Link>
      </Button>
    </div>
  )
}

export function AdminUnavailable({ page }: { page?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <ShieldOff className="size-8 text-muted-foreground/70" />
      <div className="text-sm font-medium">{t('auth.adminOnlyTitle')}</div>
      <p className="max-w-md text-xs text-muted-foreground">
        {page ? t('auth.adminOnlyPage', { page }) : t('auth.adminOnlyHint')}
      </p>
      <Button asChild size="sm" variant="outline">
        <Link to="/">{t('nav.overview')}</Link>
      </Button>
    </div>
  )
}
