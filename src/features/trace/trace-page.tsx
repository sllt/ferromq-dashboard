import { useTranslation } from 'react-i18next'
import { DiagnosticGapPage } from '@/features/diagnostics/gap-page'
import { endpoints } from '@/lib/endpoints'

export function TracePage() {
  const { t } = useTranslation()
  return (
    <DiagnosticGapPage
      queryKey="trace"
      queryFn={endpoints.trace}
      titleKey="tracePage.title"
      descKey="tracePage.desc"
      unavailableKey="tracePage.unavailableTitle"
      extra={<p className="max-w-xl text-xs text-muted-foreground">{t('tracePage.writeHint')}</p>}
    />
  )
}
