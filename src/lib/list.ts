import { ApiError, apiGetResponse } from '@/lib/api'
import { parseListResponse, type ListQuery, type PageResult } from '@/lib/list-parse'

export {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  nextOffset,
  pagingParams,
  parseListResponse,
  prevOffset,
  type ListFormat,
  type ListQuery,
  type PageResult,
} from '@/lib/list-parse'

let pageFormatSupported: boolean | null = null

export function resetPageFormatProbe() {
  pageFormatSupported = null
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
    const parsed = parseListResponse<T>(res.data, res.headers as Record<string, unknown>, params)
    if (parsed.format === 'page') pageFormatSupported = true
    return parsed
  } catch (error) {
    if (tryPage && pageFormatSupported !== true && shouldRetryWithoutFormat(error)) {
      pageFormatSupported = false
      const res = await apiGetResponse<unknown>(path, params)
      return parseListResponse<T>(res.data, res.headers as Record<string, unknown>, params)
    }
    throw error
  }
}
