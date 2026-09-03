import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { parseErrorBody, type ApiErrorBody } from '@/lib/api-error'
import i18n from '@/lib/i18n'
import { clearAuthSession, getAuthToken } from '@/lib/auth-store'
import { compactParams } from '@/lib/utils'

export type { ApiErrorBody }
export { parseErrorBody }

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRedirect?: boolean
  }
}

export class ApiError extends Error {
  status: number
  code?: number | string
  details?: unknown
  requestId?: string
  body: string
  fromApi: boolean
  data?: unknown

  constructor(init: {
    status: number
    message: string
    code?: number | string
    details?: unknown
    requestId?: string
    body?: string
    fromApi?: boolean
    data?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.details = init.details
    this.requestId = init.requestId
    this.body = init.body ?? init.message
    this.fromApi = init.fromApi ?? false
    this.data = init.data
  }
}

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
  withCredentials: true,
  validateStatus: () => true,
})

function isAuthPath(url: string | undefined): boolean {
  if (!url) return false
  return /(?:^|\/)auth\/(me|login|logout|init|change-password)(?:\?|$)/.test(url)
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.withCredentials = true
  return config
})

api.interceptors.response.use((response) => {
  if (response.status === 401) {
    const cfg = response.config as InternalAxiosRequestConfig
    const skip = cfg.skipAuthRedirect === true || isAuthPath(cfg.url)
    if (!skip) {
      clearAuthSession()
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login'
      }
    }
    throw toApiError(response)
  }

  if (response.status >= 400) {
    throw toApiError(response)
  }

  return response
})

function looksLikeHtml(value: string): boolean {
  return /^\s*</.test(value)
}

function toApiError(response: AxiosResponse): ApiError {
  const parsed = parseErrorBody(response.data)
  const raw =
    typeof response.data === 'string' && response.data.trim() && !looksLikeHtml(response.data)
      ? response.data.trim().slice(0, 400)
      : ''
  const headerId = response.headers?.['x-request-id']
  const requestId =
    parsed?.request_id ?? (typeof headerId === 'string' && headerId ? headerId : undefined)
  const message = parsed?.message?.trim() || raw || `HTTP ${response.status}`
  return new ApiError({
    status: response.status,
    message,
    code: parsed?.code ?? response.status,
    details: parsed?.details,
    requestId,
    body: message,
    fromApi: Boolean(parsed?.message),
    data: response.data,
  })
}

function statusKey(status: number): string {
  if (status === 400) return 'errors.badRequest'
  if (status === 401) return 'errors.unauthorized'
  if (status === 403) return 'errors.forbidden'
  if (status === 404) return 'errors.notFound'
  if (status === 409) return 'errors.conflict'
  if (status === 429) return 'errors.tooManyRequests'
  if (status === 503 || status === 502) return 'errors.unavailable'
  return 'errors.generic'
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = i18n.t(statusKey(error.status))
    const base = error.fromApi && error.message ? error.message : mapped || error.message
    if (error.requestId) {
      return `${base} (${i18n.t('errors.requestId')}: ${error.requestId})`
    }
    return base
  }
  if (error instanceof AxiosError) {
    if (!error.response) return i18n.t('errors.unavailable')
    return error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export function getErrorTitle(error: unknown): string {
  if (error instanceof ApiError) {
    const title = i18n.t(statusKey(error.status))
    return title || i18n.t('common.error')
  }
  return i18n.t('common.error')
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<T>(path, { params: compactParams(params) })
  return res.data
}

export async function apiGetResponse<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<AxiosResponse<T>> {
  return api.get<T>(path, { params: compactParams(params) })
}

export async function apiPost<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const res = await api.post<T>(path, body, { params: compactParams(params) })
  return res.data
}

export async function apiPut<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const res = await api.put<T>(path, body, { params: compactParams(params) })
  return res.data
}

export async function apiDelete<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.delete<T>(path, { params: compactParams(params) })
  return res.data
}

export function toastApiError(error: unknown) {
  toast.error(getErrorMessage(error))
}
