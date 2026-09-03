import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/endpoints'
import type { FeatureFlags, FeatureNode, FeaturesResponse } from '@/lib/types'

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

/** Prefer P2 `enabled` (OR across reachable nodes). Fail-open only when /features is missing. */
export function summarizeFlags(data?: FeaturesResponse | null): FeatureFlags {
  if (!data) {
    const flags: FeatureFlags = {}
    for (const key of FEATURE_KEYS) flags[key] = true
    return flags
  }
  if (data.enabled) return data.enabled
  const flags: FeatureFlags = {}
  const nodes = featureNodes(data)
  for (const key of FEATURE_KEYS) {
    flags[key] = nodes.some((n) => n.features?.[key] === true)
  }
  return flags
}

export function useClusterFeatures() {
  const query = useQuery({
    queryKey: ['features'],
    queryFn: endpoints.features,
    staleTime: 30_000,
    retry: 1,
  })
  const flags = summarizeFlags(query.data)
  return {
    ...query,
    flags,
    nodes: featureNodes(query.data),
    partial: query.data?.partial === true || (query.data?.failed_count ?? 0) > 0,
    has: (key: FeatureKey) => flags[key] !== false,
  }
}

export function useRequiredFeature(feature: FeatureKey) {
  const cluster = useClusterFeatures()
  return {
    ...cluster,
    allowed: cluster.isLoading || cluster.isError ? true : cluster.has(feature),
  }
}
