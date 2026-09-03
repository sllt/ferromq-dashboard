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
  return !!value && typeof value === 'object' && 'features' in value && 'node_id' in value
}

export function featureNodes(data?: FeaturesResponse | null): FeatureNode[] {
  return (data?.nodes ?? []).filter(isFeatureNode)
}

/** A capability is available when any reachable node reports it. Fail-open if /features is missing. */
export function summarizeFlags(data?: FeaturesResponse | null): FeatureFlags {
  const flags: FeatureFlags = {}
  const nodes = featureNodes(data)
  if (nodes.length === 0) {
    for (const key of FEATURE_KEYS) flags[key] = true
    return flags
  }
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
