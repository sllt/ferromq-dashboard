import type { FeatureFlags, FeatureNode, FeaturesResponse } from './types'

export const FEATURE_KEYS = [
  'retain',
  'message_storage',
  'session_storage',
  'delayed',
  'shared_subscription',
  'auto_subscription',
] as const satisfies readonly (keyof FeatureFlags)[]

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export function isFeatureNode(value: unknown): value is FeatureNode {
  if (!value || typeof value !== 'object') return false
  const rec = value as FeatureNode
  if (rec.ok === false) return false
  return rec.features != null && rec.node_id != null
}

export function featureNodes(data?: FeaturesResponse | null): FeatureNode[] {
  return (data?.nodes ?? []).filter(isFeatureNode)
}

export function featureFailures(data?: FeaturesResponse | null): Array<{ key: string; error: string }> {
  return (data?.nodes ?? []).flatMap((node) => {
    if (typeof node === 'string') return [{ key: node, error: node }]
    if (node && typeof node === 'object' && node.ok === false) {
      return [{ key: String(node.node_id ?? node.node_name ?? node.error), error: node.error ?? 'unavailable' }]
    }
    return []
  })
}

/** Prefer P2 `enabled` (OR across reachable nodes). Missing /features or a query error is fail-closed. */
export function summarizeFlags(data?: FeaturesResponse | null): FeatureFlags {
  const flags: FeatureFlags = {}
  for (const key of FEATURE_KEYS) flags[key] = false
  if (!data) return flags
  if (data.enabled) {
    for (const key of FEATURE_KEYS) {
      flags[key] = data.enabled[key] === true
    }
    return flags
  }
  const nodes = featureNodes(data)
  for (const key of FEATURE_KEYS) {
    flags[key] = nodes.some((n) => n.features?.[key] === true)
  }
  return flags
}
