import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'
import { clearAuthSession, getAuthToken } from '@/lib/auth-store'
import { compactParams } from '@/lib/utils'

export class ApiError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
  validateStatus: () => true,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use((response) => {
  if (response.status === 401) {
    clearAuthSession()
    if (!window.location.hash.includes('/login')) {
      window.location.hash = '#/login'
    }
    throw new ApiError(401, 'Unauthorized')
  }

  if (response.status >= 400) {
    const data = response.data
    const body =
      typeof data === 'string'
        ? data
        : data && typeof data === 'object'
          ? JSON.stringify(data)
          : `HTTP ${response.status}`
    throw new ApiError(response.status, body.slice(0, 400))
  }

  return response
})

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.body || error.message
  if (error instanceof AxiosError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<T>(path, { params: compactParams(params) })
  return res.data
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.post<T>(path, body)
  return res.data
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.put<T>(path, body)
  return res.data
}

export async function apiDelete<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.delete<T>(path, { params: compactParams(params) })
  return res.data
}

export function toastApiError(error: unknown) {
  toast.error(getErrorMessage(error))
}
