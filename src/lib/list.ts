import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios'
import { ApiError, apiGetResponse } from '@/lib/api'

export const DEFAULT_PAGE_SIZE = 50
export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const

export type ListFormat = 'page' | 'items' | 'array'

export type PageResult<T> = {
  items: T[]
  rowCount: number
  truncated: boolean
  offset: number
  limit: number
  format: ListFormat
}

export type ListQuery = Record<string, unknown> & {
  _limit?: number
  limit?: number
  offset?: number
  _offset?: number
}

type Headers = AxiosResponseHeaders | RawAxiosResponseHeaders | Record<string, unknown>

let pageFormatSupported: boolean | null = null

export function resetPageFormatProbe() {
  pageFormatSupported = null
}

function headerValue(headers: Headers | undefined, name: string): string | undefined {
  if (!headers) return undefined
  const lower = name.toLowerCase()
  const rec = headers as Record<string, unknown>
  const getter = (headers as { get?: (key: string) => unknown }).get
  const raw = rec[name] ?? rec[lower] ?? (typeof getter === 'function' ? getter.call(headers, name) : undefined)
  if (Array.isArray(raw)) return raw[0] == null ? undefined : String(raw[0])
  if (raw == null) return undefined
  return String(raw)
}

function parseIntHeader(headers: Headers | undefined, name: string): number | undefined {
  const raw = headerValue(headers, name)
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function parseBoolHeader(headers: Headers | undefined, name: string): boolean | undefined {
  const raw = headerValue(headers, name)?.trim().toLowerCase()
  if (raw == null || raw === '') return undefined
  if (raw === 'true' || raw === '1' || raw === 'yes') return true
  if (raw === 'false' || raw === '0' || raw === 'no') return false
  return undefined
}

function requestedOffset(params?: ListQuery): number {
  const n = Number(params?.offset ?? params?._offset ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function requestedLimit(params?: ListQuery): number {
  const n = Number(params?._limit ?? params?.limit ?? DEFAULT_PAGE_SIZE)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PAGE_SIZE
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickItems<T>(rec: Record<string, unknown>): T[] | null {
  const raw = rec.items ?? rec.data ?? rec.rows
  return Array.isArray(raw) ? (raw as T[]) : null
}

export function parseListResponse<T>(
  data: unknown,
  headers: Headers | undefined,
  params?: ListQuery,
): PageResult<T> {
  const headerCount = parseIntHeader(headers, 'x-row-count')
  const headerTrunc = parseBoolHeader(headers, 'x-truncated')
  const offset = requestedOffset(params)
  const limit = requestedLimit(params)

  if (Array.isArray(data)) {
    return {
      items: data as T[],
      rowCount: headerCount ?? data.length,
      truncated: headerTrunc ?? false,
      offset,
      limit,
      format: 'array',
    }
  }

  const rec = asRecord(data)
  if (rec) {
    const items = pickItems<T>(rec)
    if (items) {
      const rowCount =
        (typeof rec.row_count === 'number' ? rec.row_count : undefined) ??
        (typeof rec.total === 'number' ? rec.total : undefined) ??
        headerCount ??
        items.length
      const truncated =
        (typeof rec.truncated === 'boolean' ? rec.truncated : undefined) ??
        (typeof rec.has_more === 'boolean' ? rec.has_more : undefined) ??
        headerTrunc ??
        false
      const pageOffset = typeof rec.offset === 'number' ? rec.offset : offset
      const pageLimit = typeof rec.limit === 'number' ? rec.limit : limit
      const looksPaged =
        rec.row_count != null || rec.truncated != null || rec.offset != null || rec.limit != null
      return {
        items,
        rowCount,
        truncated,
        offset: pageOffset,
        limit: pageLimit,
        format: looksPaged ? 'page' : 'items',
      }
    }
  }

  return {
    items: data == null ? [] : [data as T],
    rowCount: headerCount ?? (data == null ? 0 : 1),
    truncated: headerTrunc ?? false,
    offset,
    limit,
    format: 'array',
  }
}

function shouldRetryWithoutFormat(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.status !== 400 && error.status !== 404 && error.status !== 422) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('format') ||
    msg.includes('unknown') ||
    msg.includes('invalid') ||
    msg.includes('unexpected') ||
    error.status === 400
  )
}

export async function apiGetList<T>(path: string, params?: ListQuery): Promise<PageResult<T>> {
  const tryPage = pageFormatSupported !== false
  const query = tryPage ? { ...params, format: 'page' } : params

  try {
    const res = await apiGetResponse<unknown>(path, query)
    const parsed = parseListResponse<T>(res.data, res.headers, params)
    if (parsed.format === 'page') pageFormatSupported = true
    return parsed
  } catch (error) {
    if (tryPage && pageFormatSupported !== true && shouldRetryWithoutFormat(error)) {
      pageFormatSupported = false
      const res = await apiGetResponse<unknown>(path, params)
      return parseListResponse<T>(res.data, res.headers, params)
    }
    throw error
  }
}

export function pagingParams(offset: number, limit: number): { _limit: number; offset: number; _offset: number } {
  return { _limit: limit, offset, _offset: offset }
}

export function nextOffset(page: Pick<PageResult<unknown>, 'offset' | 'limit' | 'items' | 'truncated'>): number | null {
  if (!page.truncated && page.items.length < page.limit) return null
  if (page.items.length === 0) return null
  return page.offset + page.limit
}

export function prevOffset(page: Pick<PageResult<unknown>, 'offset' | 'limit'>): number | null {
  if (page.offset <= 0) return null
  return Math.max(0, page.offset - page.limit)
}
