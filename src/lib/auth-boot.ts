import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { endpoints } from '@/lib/endpoints'
import {
  parseChangePasswordResult,
  parseInitAdminResult,
  parseSessionUser,
  type ChangePasswordResult,
  type InitAdminResult,
  type SessionUser,
} from '@/lib/session-user'

let inflight: Promise<void> | null = null

export async function ensureSession(): Promise<void> {
  if (useAuthStore.getState().hydrated) return
  if (inflight) return inflight
  inflight = hydrate()
  try {
    await inflight
  } finally {
    inflight = null
  }
}

async function applyMe(): Promise<void> {
  const user = parseSessionUser(await endpoints.me())
  if (user) useAuthStore.getState().applySession(user)
  else useAuthStore.getState().clearLocal()
}

async function hydrate() {
  try {
    await applyMe()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      useAuthStore.getState().clearLocal()
      return
    }
    try {
      await applyMe()
    } catch {
      // Non-401 (5xx / network): never keep a stale sessionStorage role.
      useAuthStore.getState().clearLocal()
    }
  }
}

function requireUser(raw: unknown): SessionUser {
  const user = parseSessionUser(raw)
  if (!user) throw new Error('Invalid session payload')
  return user
}

export async function loginWithPassword(username: string, password: string): Promise<SessionUser> {
  const user = requireUser(await endpoints.login({ username, password }))
  useAuthStore.getState().applySession(user, null)
  return user
}

export async function loginWithBearer(token: string): Promise<SessionUser> {
  useAuthStore.getState().setBearerToken(token)
  try {
    const user = requireUser(await endpoints.me())
    useAuthStore.getState().applySession(user, token)
    return user
  } catch (err) {
    useAuthStore.getState().clearLocal()
    throw err
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await endpoints.logout()
  } catch {
    // Cookie may already be gone; still drop local identity / bearer.
  }
  useAuthStore.getState().clearLocal()
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  const result = parseChangePasswordResult(
    await endpoints.changePassword({ old_password: oldPassword, new_password: newPassword }),
  )
  if (!result) throw new Error('Invalid change-password payload')
  // Cookie is rotated; refresh identity. Never treat `{ok,session_rotated}` as SessionUser.
  try {
    await applyMe()
  } catch {
    useAuthStore.getState().clearLocal()
  }
  return result
}

export async function initAdminFromConfig(): Promise<InitAdminResult> {
  const result = parseInitAdminResult(await endpoints.init())
  if (!result) throw new Error('Invalid init payload')
  return result
}
