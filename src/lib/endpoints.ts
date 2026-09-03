import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import type {
  ApiEndpoint,
  BrokerInfo,
  ClientInfo,
  ClientQuery,
  FeaturesResponse,
  FeatureNode,
  HealthCheck,
  HistoryCluster,
  HistoryQuery,
  HistorySum,
  NodeHealth,
  NodeInfo,
  NodeMetrics,
  NodePlugins,
  NodeStats,
  PluginInfo,
  PublishRequest,
  RetainsResponse,
  RouteInfo,
  StatsSum,
  SubscriptionInfo,
} from '@/lib/types'

export const endpoints = {
  listApis: () => apiGet<ApiEndpoint[]>('/'),
  brokers: async (node?: number) =>
    asArray(await (node == null ? apiGet<BrokerInfo[] | BrokerInfo>('/brokers') : apiGet<BrokerInfo>(`/brokers/${node}`))),
  nodes: async (node?: number) =>
    asArray(await (node == null ? apiGet<NodeInfo[] | NodeInfo>('/nodes') : apiGet<NodeInfo>(`/nodes/${node}`))),
  features: () => apiGet<FeaturesResponse>('/features'),
  featuresNode: (node: number) => apiGet<FeatureNode>(`/features/${node}`),
  health: () => apiGet<HealthCheck>('/health/check'),
  healthNode: (node: number) => apiGet<NodeHealth>(`/health/check/${node}`),

  clients: (query?: ClientQuery) => apiGet<ClientInfo[]>('/clients', query),
  offlines: (query?: ClientQuery) => apiGet<ClientInfo[]>('/clients/offlines', query),
  client: (clientid: string) => apiGet<ClientInfo>(`/clients/${encodeURIComponent(clientid)}`),
  kickClient: (clientid: string) => apiDelete<string>(`/clients/${encodeURIComponent(clientid)}`),
  kickOfflines: (query?: ClientQuery) => apiDelete<{ count: number }>('/clients/offlines', query),
  clientOnline: (clientid: string) =>
    apiGet<boolean>(`/clients/${encodeURIComponent(clientid)}/online`),

  subscriptions: (query?: Record<string, unknown>) =>
    apiGet<SubscriptionInfo[]>('/subscriptions', query),
  clientSubscriptions: (clientid: string) =>
    apiGet<SubscriptionInfo[]>(`/subscriptions/${encodeURIComponent(clientid)}`),

  routes: (limit?: number) => apiGet<RouteInfo[]>('/routes', { _limit: limit }),
  route: (topic: string) => apiGet<RouteInfo[]>(`/routes/${encodeURIComponent(topic)}`),

  retains: (query?: { topic_filter?: string; offset?: number; limit?: number }) =>
    apiGet<RetainsResponse>('/retains', query),
  deleteRetain: (topic: string) => apiDelete<unknown>('/retains', { topic }),

  publish: (body: PublishRequest) => apiPost<string>('/mqtt/publish', body),
  subscribe: (body: { topic?: string; topics?: string; clientid: string; qos?: number }) =>
    apiPost<Record<string, boolean | string>>('/mqtt/subscribe', body),
  unsubscribe: (body: { topic: string; clientid: string }) =>
    apiPost<unknown>('/mqtt/unsubscribe', body),

  plugins: () => apiGet<NodePlugins[]>('/plugins'),
  nodePlugins: (node: number) => apiGet<PluginInfo[]>(`/plugins/${node}`),
  plugin: (node: number, name: string) =>
    apiGet<PluginInfo>(`/plugins/${node}/${encodeURIComponent(name)}`),
  pluginConfig: (node: number, name: string) =>
    apiGet<unknown>(`/plugins/${node}/${encodeURIComponent(name)}/config`),
  pluginReload: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/config/reload`),
  pluginLoad: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/load`),
  pluginUnload: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/unload`),

  stats: () => apiGet<NodeStats[]>('/stats'),
  statsSum: () => apiGet<StatsSum>('/stats/sum'),
  statsHistory: (query?: HistoryQuery) => apiGet<HistoryCluster>('/stats/history', query),
  statsHistorySum: (query?: HistoryQuery) => apiGet<HistorySum>('/stats/history/sum', query),

  metrics: () => apiGet<NodeMetrics[]>('/metrics'),
  metricsSum: () => apiGet<Record<string, number>>('/metrics/sum'),
  metricsHistory: (query?: HistoryQuery) => apiGet<HistoryCluster>('/metrics/history', query),
  metricsHistorySum: (query?: HistoryQuery) => apiGet<HistorySum>('/metrics/history/sum', query),
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}
