import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable } from '@/components/data-table'
import { ListMeta } from '@/components/list-meta'
import { PageHeader } from '@/components/page-header'
import { ErrorState, TableSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { endpoints } from '@/lib/endpoints'
import { DEFAULT_PAGE_SIZE, pagingParams } from '@/lib/list'
import type { RouteInfo } from '@/lib/types'

export function RoutesPage() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState('')
  const [lookup, setLookup] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const listQ = useQuery({
    queryKey: ['routes', lookup, offset, limit],
    queryFn: () => (lookup ? endpoints.route(lookup) : endpoints.routes(pagingParams(offset, limit))),
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
          setOffset(0)
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
            setOffset(0)
            setLimit(DEFAULT_PAGE_SIZE)
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
        <DataTable
          columns={columns}
          data={listQ.data?.items ?? []}
          searchKey="topic"
          hidePagination={!lookup}
          footer={
            !lookup && listQ.data ? (
              <ListMeta
                page={listQ.data}
                onOffsetChange={setOffset}
                onLimitChange={(n) => {
                  setLimit(n)
                  setOffset(0)
                }}
              />
            ) : null
          }
        />
      )}
    </div>
  )
}
