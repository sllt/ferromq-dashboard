/**
 * Thin HTTP wrappers over `/api/v1`.
 *
 * Types are generated from the vendored OpenAPI stub:
 *   pnpm gen:api
 * Refresh the stub from a live broker:
 *   curl localhost:6060/api/v1/openapi.json  (or `pnpm gen:api:live`)
 */
export type { components, paths } from '@/api/generated/schema'
export {
  api,
  apiDelete,
  apiGet,
  apiGetResponse,
  apiPost,
  apiPut,
  ApiError,
  getErrorMessage,
  getErrorTitle,
  toastApiError,
} from '@/lib/api'
export { apiGetList, parseListResponse, type PageResult } from '@/lib/list'
