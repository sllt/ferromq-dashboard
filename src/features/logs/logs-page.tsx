import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DiagnosticGapPage } from '@/features/diagnostics/gap-page'
import { endpoints } from '@/lib/endpoints'

export function LogsPage() {
  const { t } = useTranslation()
  return (
    <DiagnosticGapPage
      queryKey="logs"
      queryFn={endpoints.logs}
      titleKey="logsPage.title"
      descKey="logsPage.desc"
      unavailableKey="logsPage.unavailableTitle"
      extra={
        <Button asChild size="sm" variant="outline">
          <Link to="/broker-config" search={{ section: 'log' }}>
            {t('logsPage.goConfig')}
          </Link>
        </Button>
      }
    />
  )
}
