export type UserRole = 'admin' | 'operator' | 'viewer'
export type AuthKind = 'session' | 'bearer' | 'api_key' | 'anonymous'

export type SessionUser = {
  username: string
  role: UserRole
  auth: AuthKind
  expires_in?: number
  key_id?: string
}

/** POST /auth/change-password — `{ ok, session_rotated }`, not a SessionUser. */
export type ChangePasswordResult = {
  ok: boolean
  session_rotated?: boolean
}

/** POST /auth/init — `{ username, role, created }`. Does not create a session. */
export type InitAdminResult = {
  username: string
  role: UserRole
  created: boolean
}

const ROLES = new Set<UserRole>(['admin', 'operator', 'viewer'])
const KINDS = new Set<AuthKind>(['session', 'bearer', 'api_key', 'anonymous'])

export function parseSessionUser(data: unknown): SessionUser | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const rec = data as Record<string, unknown>
  if (typeof rec.username !== 'string' || !rec.username) return null
  if (typeof rec.role !== 'string' || !ROLES.has(rec.role as UserRole)) return null
  if (typeof rec.auth !== 'string' || !KINDS.has(rec.auth as AuthKind)) return null
  return {
    username: rec.username,
    role: rec.role as UserRole,
    auth: rec.auth as AuthKind,
    expires_in: typeof rec.expires_in === 'number' ? rec.expires_in : undefined,
    key_id: typeof rec.key_id === 'string' ? rec.key_id : undefined,
  }
}

export function parseChangePasswordResult(data: unknown): ChangePasswordResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const rec = data as Record<string, unknown>
  if (rec.ok !== true) return null
  return {
    ok: true,
    session_rotated: typeof rec.session_rotated === 'boolean' ? rec.session_rotated : undefined,
  }
}

export function parseInitAdminResult(data: unknown): InitAdminResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const rec = data as Record<string, unknown>
  if (typeof rec.username !== 'string' || !rec.username) return null
  if (typeof rec.role !== 'string' || !ROLES.has(rec.role as UserRole)) return null
  if (rec.created !== true) return null
  return {
    username: rec.username,
    role: rec.role as UserRole,
    created: true,
  }
}

/** Kick / publish / plugin config write — admin and operator. */
export function canWrite(user: SessionUser | null | undefined): boolean {
  return user != null && user.role !== 'viewer'
}

/** Users / API keys / audit / broker config write / reveal secrets — admin only. */
export function canAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function formatUnixTime(ts?: number | null): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const ms = ts > 1e12 ? ts : ts * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}
