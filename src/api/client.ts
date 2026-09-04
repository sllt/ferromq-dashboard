/**
 * Thin HTTP wrappers over `/api/v1`.
 *
 * Generated OpenAPI types (`src/api/generated/schema.d.ts`) are the contract
 * for auth request/response shapes used by `src/lib/endpoints.ts`.
 * Runtime parsers in `src/lib/session-user.ts` still validate live JSON.
 *
 *   pnpm gen:api
 * Refresh the stub from a live broker:
 *   curl localhost:6060/api/v1/openapi.json  (or `pnpm gen:api:live`)
 */
export type { components, paths } from '@/api/generated/schema'
export {
  api,
  apiDelete,
  apiGet,
  apiGetOptional,
  apiGetResponse,
  apiPost,
  apiPut,
  ApiError,
  getErrorMessage,
  getErrorTitle,
  toastApiError,
} from '@/lib/api'
export { apiGetList, parseListResponse, type PageResult } from '@/lib/list'
