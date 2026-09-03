import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/endpoints'
import { featureNodes, summarizeFlags, type FeatureKey } from '@/lib/feature-flags'

export {
  FEATURE_KEYS,
  featureFailures,
  featureNodes,
  isFeatureNode,
  summarizeFlags,
  type FeatureKey,
} from '@/lib/feature-flags'

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
    has: (key: FeatureKey) => flags[key] === true,
  }
}

export function useRequiredFeature(feature: FeatureKey) {
  const cluster = useClusterFeatures()
  return {
    ...cluster,
    allowed: !cluster.isLoading && !cluster.isError && cluster.has(feature),
  }
}
