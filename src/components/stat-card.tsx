import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 truncate font-mono text-2xl font-semibold tabular-nums">{value}</div>
            {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
          </div>
          {icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
