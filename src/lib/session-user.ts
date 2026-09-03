export type UserRole = 'admin' | 'operator' | 'viewer'
export type AuthKind = 'session' | 'bearer' | 'api_key' | 'anonymous'

export type SessionUser = {
  username: string
  role: UserRole
  auth: AuthKind
  expires_in?: number
  key_id?: string
  created?: boolean
  ok?: boolean
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
    created: typeof rec.created === 'boolean' ? rec.created : undefined,
    ok: typeof rec.ok === 'boolean' ? rec.ok : undefined,
  }
}

/** Kick / publish / plugin load — admin and operator. */
export function canWrite(user: SessionUser | null | undefined): boolean {
  return user != null && user.role !== 'viewer'
}

/** Users / API keys / audit — admin only. */
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
