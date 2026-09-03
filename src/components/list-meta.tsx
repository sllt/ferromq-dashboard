import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS, nextOffset, prevOffset, type PageResult } from '@/lib/list'

type ListMetaProps<T> = {
  page: PageResult<T>
  onOffsetChange: (offset: number) => void
  onLimitChange?: (limit: number) => void
}

export function ListMeta<T>({ page, onOffsetChange, onLimitChange }: ListMetaProps<T>) {
  const { t } = useTranslation()
  const prev = prevOffset(page)
  const next = nextOffset(page)
  const pageNo = Math.floor(page.offset / Math.max(page.limit, 1)) + 1

  return (
    <div className="space-y-2">
      {page.truncated ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{t('list.truncated', { count: page.rowCount })}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t('list.showing', {
            from: page.items.length === 0 ? 0 : page.offset + 1,
            to: page.offset + page.items.length,
            total: page.rowCount,
          })}
        </span>
        <div className="flex items-center gap-2">
          {onLimitChange ? (
            <Select value={String(page.limit)} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="h-8 w-[7.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t('list.perPage', { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button size="sm" variant="outline" disabled={prev == null} onClick={() => prev != null && onOffsetChange(prev)}>
            {t('common.prev')}
          </Button>
          <span>
            {t('common.page')} {pageNo}
          </span>
          <Button size="sm" variant="outline" disabled={next == null} onClick={() => next != null && onOffsetChange(next)}>
            {t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
