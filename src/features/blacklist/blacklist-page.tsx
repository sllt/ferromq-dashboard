import { useQuery } from '@tanstack/react-query'
import { Ban, ShieldOff } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { ErrorState, PageSkeleton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { endpoints } from '@/lib/endpoints'

export function BlacklistPage() {
  const { t } = useTranslation()
  const listQ = useQuery({ queryKey: ['blacklist'], queryFn: endpoints.blacklist })

  return (
    <div>
      <PageHeader
        title={t('blacklist.title')}
        description={t('blacklist.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      {listQ.isLoading ? (
        <PageSkeleton cards={1} rows={3} />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : listQ.data?.available === false ? (
        <UnavailableGap
          gap={listQ.data.gap}
          alternatives={listQ.data.alternatives}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="size-4" />
              {t('blacklist.availableTitle')}
            </CardTitle>
            <CardDescription>{t('blacklist.availableHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('common.rows', { count: listQ.data?.items?.length ?? 0 })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UnavailableGap({
  gap,
  alternatives,
}: {
  gap?: string
  alternatives?: { plugin?: string; how?: string }[]
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
        <ShieldOff className="size-8 text-muted-foreground/70" />
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t('integrations.unavailable')}</Badge>
          <div className="text-sm font-medium">{t('blacklist.unavailableTitle')}</div>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{gap ?? t('blacklist.unavailableHint')}</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/acl">{t('blacklist.goAcl')}</Link>
        </Button>
      </div>
      {alternatives && alternatives.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {alternatives.map((alt) => (
            <Card key={`${alt.plugin}:${alt.how}`}>
              <CardHeader>
                <CardTitle className="text-sm">{alt.plugin ?? t('blacklist.alternative')}</CardTitle>
                <CardDescription>{t('blacklist.alternativeHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alt.how ? <p className="font-mono text-xs leading-5 text-muted-foreground">{alt.how}</p> : null}
                {alt.plugin === 'ferromq-acl' ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/acl">{t('nav.acl')}</Link>
                  </Button>
                ) : alt.plugin === 'ferromq-auth-http' ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/auth-providers">{t('nav.authProviders')}</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
