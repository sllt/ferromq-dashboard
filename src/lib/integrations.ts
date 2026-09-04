import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { REDACTED } from '@/lib/config'
import type { AclTopic, AclWho, AclWhoObject, ConfigWriteResult } from '@/lib/types'

export function toastWriteResult(r: ConfigWriteResult, okKey: string, t: TFunction) {
  if (r.apply_error) toast.error(r.apply_error)
  else toast.success(t(okKey))
  if (r.note) toast.message(r.note)
}

export function isWhoObject(who: unknown): who is AclWhoObject {
  return Boolean(who && typeof who === 'object' && !Array.isArray(who))
}

export function parseAclWho(who: unknown): AclWho {
  if (typeof who === 'string' && who.toLowerCase() === 'all') return 'all'
  if (isWhoObject(who)) return who
  return 'all'
}

export function sanitizeAclWho(who: AclWho): AclWho {
  if (who === 'all' || typeof who === 'string') return 'all'
  const next: AclWhoObject = {}
  if (who.user?.trim()) next.user = who.user.trim()
  if (who.password && who.password !== REDACTED) next.password = who.password
  if (who.clientid?.trim()) next.clientid = who.clientid.trim()
  if (who.ipaddr?.trim()) next.ipaddr = who.ipaddr.trim()
  if (who.protocol != null && Number.isFinite(who.protocol)) next.protocol = who.protocol
  if (who.superuser) next.superuser = true
  return Object.keys(next).length === 0 ? 'all' : next
}

export function parseTopicsText(text: string): AclTopic[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('eq:')) return { eq: line.slice(3).trim() }
      if (line.startsWith('=')) return { eq: line.slice(1).trim() }
      return line
    })
    .filter((t) => (typeof t === 'string' ? t.length > 0 : Boolean(t.eq)))
}

export function topicsToText(topics?: AclTopic[]): string {
  if (!topics?.length) return ''
  return topics
    .map((t) => (typeof t === 'string' ? t : t.eq ? `=${t.eq}` : ''))
    .filter(Boolean)
    .join('\n')
}

export function formatWho(who: unknown): string {
  if (who == null) return ''
  if (typeof who === 'string') return who
  if (isWhoObject(who)) {
    const parts: string[] = []
    if (who.user) parts.push(`user=${who.user}`)
    if (who.clientid) parts.push(`clientid=${who.clientid}`)
    if (who.ipaddr) parts.push(`ip=${who.ipaddr}`)
    if (who.protocol != null) parts.push(`proto=${who.protocol}`)
    if (who.superuser) parts.push('superuser')
    if (who.password) parts.push(`password=${who.password === REDACTED ? REDACTED : '••••'}`)
    return parts.join(' ') || '{}'
  }
  try {
    return JSON.stringify(who)
  } catch {
    return String(who)
  }
}

export function stringAt(rec: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = rec
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : ''
}

export function setNested(rec: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  let cur = rec
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const next = cur[key]
    if (!next || typeof next !== 'object' || Array.isArray(next)) cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export function summarizeAttrs(attrs: unknown): string {
  if (attrs == null || attrs === '') return ''
  if (typeof attrs === 'string') return attrs
  try {
    const text = JSON.stringify(attrs)
    return text.length > 96 ? `${text.slice(0, 93)}…` : text
  } catch {
    return ''
  }
}

export function linesToList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
