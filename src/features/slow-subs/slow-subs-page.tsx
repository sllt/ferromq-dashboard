import { DiagnosticGapPage } from '@/features/diagnostics/gap-page'
import { endpoints } from '@/lib/endpoints'

export function SlowSubsPage() {
  return (
    <DiagnosticGapPage
      queryKey="slow-subs"
      queryFn={endpoints.slowSubs}
      titleKey="slowSubs.title"
      descKey="slowSubs.desc"
      unavailableKey="slowSubs.unavailableTitle"
    />
  )
}
