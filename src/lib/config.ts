import type {
  BrokerConfigSection,
  ConfigDiff,
  ConfigValidateResult,
  EffectiveMode,
} from './types'

export const REDACTED = '***'

export const BROKER_SECTIONS: BrokerConfigSection[] = ['mqtt', 'listener', 'log']

const SECRET_NEEDLES = ['password', 'token', 'private_key', 'secret'] as const

/** Mirror ferromq-http-api `is_secret_key`. */
export function isSecretKey(key: string): boolean {
  const k = key.trim().toLowerCase().replace(/-/g, '_')
  if (!k) return false
  if (k === 'jwt' || k.startsWith('jwt_') || k.includes('_jwt')) return true
  for (const needle of SECRET_NEEDLES) {
    if (k === needle || k.endsWith(`_${needle}`) || k.includes(`${needle}_`) || k.includes(needle)) {
      return true
    }
  }
  return false
}

export function isRedactedValue(value: unknown): boolean {
  return value === REDACTED
}

export function isEffectiveMode(value: unknown): value is EffectiveMode {
  return value === 'hot' || value === 'reload' || value === 'restart_required'
}

export type SecretField = {
  path: string
  key: string
  redacted: boolean
}

export function collectSecretFields(value: unknown, prefix = ''): SecretField[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectSecretFields(item, prefix ? `${prefix}[${i}]` : `[${i}]`))
  }
  if (!value || typeof value !== 'object') return []
  const out: SecretField[] = []
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (isSecretKey(key)) {
      out.push({ path, key, redacted: isRedactedValue(child) })
      if (child && typeof child === 'object') {
        out.push(...collectSecretFields(child, path))
      }
    } else {
      out.push(...collectSecretFields(child, path))
    }
  }
  return out
}

/** Drop secret keys still equal to `***` so a broker merge keeps the file value. */
export function stripRedactedSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRedactedSecrets)
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretKey(key) && isRedactedValue(child)) continue
    out[key] = stripRedactedSecrets(child)
  }
  return out
}

export function countRedactedSecrets(value: unknown): number {
  return collectSecretFields(value).filter((f) => f.redacted).length
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}

export function parseJsonObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'object' }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid' }
  }
}

export function diffHasChanges(diff?: ConfigDiff | null): boolean {
  if (!diff) return false
  return (diff.added?.length ?? 0) + (diff.removed?.length ?? 0) + (diff.changed?.length ?? 0) > 0
}

export function parseConfigValidateResult(data: unknown): ConfigValidateResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const rec = data as Record<string, unknown>
  if (typeof rec.valid !== 'boolean' || !isEffectiveMode(rec.effective)) return null
  const diff = rec.diff && typeof rec.diff === 'object' && !Array.isArray(rec.diff) ? (rec.diff as ConfigDiff) : {}
  return {
    ok: rec.ok !== false,
    valid: rec.valid,
    effective: rec.effective,
    diff,
    errors: Array.isArray(rec.errors) ? rec.errors.filter((x): x is string => typeof x === 'string') : [],
    plugin: typeof rec.plugin === 'string' ? rec.plugin : undefined,
    node: typeof rec.node === 'number' ? rec.node : undefined,
    section: typeof rec.section === 'string' ? rec.section : undefined,
    note: typeof rec.note === 'string' ? rec.note : undefined,
  }
}

export function validateResultFromError(error: unknown): ConfigValidateResult | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null
  return parseConfigValidateResult((error as { data?: unknown }).data)
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

export function isAclPlugin(name: string): boolean {
  return /acl/i.test(name)
}

/** Writing this plugin can change `http_bearer_token` — admin-only on the broker. */
export function isHttpApiPlugin(name: string): boolean {
  return name === 'ferromq-http-api'
}
