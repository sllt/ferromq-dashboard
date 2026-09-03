export type UserRole = 'admin' | 'viewer'
export type AuthKind = 'session' | 'bearer' | 'anonymous'

export type SessionUser = {
  username: string
  role: UserRole
  auth: AuthKind
  expires_in?: number
  created?: boolean
  ok?: boolean
}

const ROLES = new Set<UserRole>(['admin', 'viewer'])
const KINDS = new Set<AuthKind>(['session', 'bearer', 'anonymous'])

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
    created: typeof rec.created === 'boolean' ? rec.created : undefined,
    ok: typeof rec.ok === 'boolean' ? rec.ok : undefined,
  }
}

export function canWrite(user: SessionUser | null | undefined): boolean {
  return user != null && user.role !== 'viewer'
}
