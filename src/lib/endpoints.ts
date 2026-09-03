import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import { partitionCluster } from '@/lib/cluster'
import { apiGetList, type ListQuery } from '@/lib/list'
import type {
  ApiEndpoint,
  BrokerInfo,
  ChangePasswordRequest,
  ClientInfo,
  ClientQuery,
  FeaturesResponse,
  FeatureNode,
  HealthCheck,
  HistoryCluster,
  HistoryQuery,
  HistorySum,
  LoginRequest,
  NodeHealth,
  NodeInfo,
  NodeMetrics,
  NodePlugins,
  NodeStats,
  PluginInfo,
  PublishRequest,
  RouteInfo,
  SessionUser,
  StatsSum,
  SubscriptionInfo,
  RetainItem,
} from '@/lib/types'

export const endpoints = {
  login: (body: LoginRequest) => apiPost<SessionUser>('/auth/login', body),
  logout: () => apiPost<SessionUser>('/auth/logout'),
  me: () => apiGet<SessionUser>('/auth/me'),
  changePassword: (body: ChangePasswordRequest) => apiPost<SessionUser>('/auth/change-password', body),
  init: () => apiPost<SessionUser>('/auth/init'),

  listApis: () => apiGet<ApiEndpoint[]>('/'),
  openapi: () => apiGet<Record<string, unknown>>('/openapi.json'),
  brokers: async (node?: number) => {
    if (node != null) return { ok: [await apiGet<BrokerInfo>(`/brokers/${node}`)], errors: [] }
    return partitionCluster<BrokerInfo>(await apiGet<BrokerInfo[] | BrokerInfo>('/brokers'))
  },
  nodes: async (node?: number) => {
    if (node != null) return { ok: [await apiGet<NodeInfo>(`/nodes/${node}`)], errors: [] }
    return partitionCluster<NodeInfo>(await apiGet<NodeInfo[] | NodeInfo>('/nodes'))
  },
  features: () => apiGet<FeaturesResponse>('/features'),
  featuresNode: (node: number) => apiGet<FeatureNode>(`/features/${node}`),
  health: () => apiGet<HealthCheck>('/health/check'),
  healthNode: (node: number) => apiGet<NodeHealth>(`/health/check/${node}`),

  clients: (query?: ClientQuery) => apiGetList<ClientInfo>('/clients', query),
  offlines: (query?: ClientQuery) => apiGetList<ClientInfo>('/clients/offlines', query),
  client: (clientid: string) => apiGet<ClientInfo>(`/clients/${encodeURIComponent(clientid)}`),
  kickClient: (clientid: string) => apiDelete<string>(`/clients/${encodeURIComponent(clientid)}`),
  kickOfflines: (query?: ClientQuery) => apiDelete<{ count: number }>('/clients/offlines', query),
  clientOnline: (clientid: string) =>
    apiGet<boolean>(`/clients/${encodeURIComponent(clientid)}/online`),

  subscriptions: (query?: ListQuery) => apiGetList<SubscriptionInfo>('/subscriptions', query),
  clientSubscriptions: (clientid: string) =>
    apiGetList<SubscriptionInfo>(`/subscriptions/${encodeURIComponent(clientid)}`),

  routes: (query?: ListQuery) => apiGetList<RouteInfo>('/routes', query),
  route: (topic: string) => apiGetList<RouteInfo>(`/routes/${encodeURIComponent(topic)}`),

  retains: (query?: { topic_filter?: string; offset?: number; limit?: number; _limit?: number }) =>
    apiGetList<RetainItem>('/retains', query),
  deleteRetain: (topic: string) => apiDelete<unknown>('/retains', { topic }),

  publish: (body: PublishRequest) => apiPost<string>('/mqtt/publish', body),
  subscribe: (body: { topic?: string; topics?: string; clientid: string; qos?: number }) =>
    apiPost<Record<string, boolean | string>>('/mqtt/subscribe', body),
  unsubscribe: (body: { topic: string; clientid: string }) =>
    apiPost<unknown>('/mqtt/unsubscribe', body),

  plugins: () => apiGetList<NodePlugins>('/plugins'),
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
