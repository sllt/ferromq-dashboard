import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { endpoints } from '@/lib/endpoints'
import type { RouteInfo } from '@/lib/types'

export function RoutesPage() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState('')
  const [lookup, setLookup] = useState('')

  const listQ = useQuery({
    queryKey: ['routes', lookup],
    queryFn: () => (lookup ? endpoints.route(lookup) : endpoints.routes(10000)),
  })

  const columns = useMemo<ColumnDef<RouteInfo>[]>(
    () => [
      { accessorKey: 'topic', header: t('common.topic') },
      { accessorKey: 'node_id', header: t('common.node') },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={t('routes.title')}
        description={t('routes.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => void listQ.refetch()}>
            {t('common.refresh')}
          </Button>
        }
      />
      <form
        className="mb-4 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setLookup(topic.trim())
        }}
      >
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('routes.lookup')}
          className="font-mono"
        />
        <Button type="submit" size="sm">
          {t('common.search')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setTopic('')
            setLookup('')
          }}
        >
          {t('common.reset')}
        </Button>
      </form>
      {listQ.isLoading ? (
        <TableSkeleton />
      ) : listQ.error ? (
        <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
      ) : (
        <DataTable columns={columns} data={listQ.data ?? []} searchKey="topic" />
      )}
    </div>
  )
}
