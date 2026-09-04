export type ApiErrorBody = {
  code?: number | string
  message?: string
  details?: unknown
  request_id?: string
}

export function parseErrorBody(data: unknown): ApiErrorBody | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const rec = data as Record<string, unknown>
  const message = typeof rec.message === 'string' ? rec.message : undefined
  const code = typeof rec.code === 'number' || typeof rec.code === 'string' ? rec.code : undefined
  const requestId = typeof rec.request_id === 'string' ? rec.request_id : undefined
  if (message == null && code == null && requestId == null && rec.details === undefined) return null
  return { code, message, details: rec.details, request_id: requestId }
}
