import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { EffectiveMode } from '@/lib/types'

const variants: Record<EffectiveMode, 'success' | 'default' | 'warning'> = {
  hot: 'success',
  reload: 'default',
  restart_required: 'warning',
}

export function EffectiveBadge({
  mode,
  className,
}: {
  mode?: EffectiveMode | null
  className?: string
}) {
  const { t } = useTranslation()
  if (!mode) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variants[mode]} className={className}>
          {t(`config.effective.${mode}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t(`config.effectiveHint.${mode}`)}</TooltipContent>
    </Tooltip>
  )
}
