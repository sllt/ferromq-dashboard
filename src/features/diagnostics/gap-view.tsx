import { Link } from '@tanstack/react-router'
import { ShieldOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { alternativeLink } from '@/lib/diagnostics'
import type { CapabilityAlternative, CapabilityGap } from '@/lib/types'

export function CapabilityGapView({
  data,
  title,
  fallbackHint,
  extra,
}: {
  data?: CapabilityGap | null
  title: string
  fallbackHint?: string
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  const alternatives = data?.alternatives ?? []
  const links = alternatives
    .map((alt) => ({ alt, link: alternativeLink(alt) }))
    .filter((row): row is { alt: CapabilityAlternative; link: NonNullable<ReturnType<typeof alternativeLink>> } =>
      row.link != null,
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
        <ShieldOff className="size-8 text-muted-foreground/70" />
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t('gap.badge')}</Badge>
          <div className="text-sm font-medium">{title}</div>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{data?.gap ?? fallbackHint ?? t('gap.hint')}</p>
        {data?.kind ? (
          <p className="font-mono text-[11px] text-muted-foreground">kind={data.kind}</p>
        ) : null}
        {extra}
      </div>
      {alternatives.length > 0 ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('gap.related')}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {alternatives.map((alt, idx) => {
              const link = links.find((row) => row.alt === alt)?.link
              return (
                <Card key={`${alt.api ?? alt.plugin ?? alt.how ?? idx}`}>
                  <CardHeader>
                    <CardTitle className="text-sm">{alt.api ?? alt.plugin ?? t('blacklist.alternative')}</CardTitle>
                    <CardDescription>{t('gap.backendGap')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {alt.how ? <p className="font-mono text-xs leading-5 text-muted-foreground">{alt.how}</p> : null}
                    {link ? (
                      <Button asChild size="sm" variant="secondary">
                        <Link to={link.to} search={link.search}>
                          {t(link.labelKey)}
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
