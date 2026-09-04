/**
 * Generated OpenAPI contract surface.
 *
 * `src/lib/endpoints.ts` types auth (and other) request/response bodies from
 * `components['schemas']` so a stale handwritten type cannot hide a contract
 * mismatch (e.g. change-password returning `{ok,session_rotated}`).
 */
export type { components, paths } from '@/api/generated/schema'
import type { components } from '@/api/generated/schema'

export type Schema = components['schemas']
export type LoginRequest = Schema['LoginRequest']
export type ChangePasswordRequest = Schema['ChangePasswordRequest']
export type ChangePasswordResult = Schema['ChangePasswordResult']
export type InitAdminResult = Schema['InitAdminResult']
export type SessionUser = Schema['SessionUser']
export type DashboardUser = Schema['DashboardUser']
export type CreateUserRequest = Schema['CreateUserRequest']
