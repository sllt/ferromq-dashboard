import { ApiError, apiDelete, apiGet, apiGetOptional, apiPost, apiPut } from '@/lib/api'
import { partitionCluster } from '@/lib/cluster'
import { parseCapabilityGap, parseClusterWriteResult } from '@/lib/diagnostics'
import { apiGetList, type ListQuery } from '@/lib/list'
import type { components } from '@/api/generated/schema'
import type {
  ApiEndpoint,
  ApiKeyCreated,
  ApiKeyInfo,
  AuditEvent,
  BrokerInfo,
  ClientInfo,
  ClientQuery,
  CreateApiKeyRequest,
  CreateUserRequest,
  DashboardUser,
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
  RouteInfo,
  StatsSum,
  SubscriptionInfo,
  RetainItem,
  AclOverview,
  AclRule,
  AclRuleInput,
  AuthProviderDetail,
  AuthProviderList,
  AutoSubscription,
  BlacklistGap,
  BridgeDetail,
  BridgeList,
  AlarmAckResult,
  AlarmList,
  BridgeToggleResult,
  BrokerConfigOverview,
  CapabilityGap,
  ClusterTopology,
  ClusterWriteResult,
  BrokerConfigSection,
  ConfigApplyMode,
  ConfigValidateResult,
  ConfigVersion,
  ConfigWriteResult,
  ConnectivityTest,
  PluginArrayList,
  TopicMetrics,
  TopicRewrite,
  WebhookRule,
  WebhooksOverview,
} from '@/lib/types'

type Schema = components['schemas']

export const endpoints = {
  login: (body: Schema['LoginRequest']) => apiPost<Schema['SessionUser']>('/auth/login', body),
  logout: () => apiPost<{ ok?: boolean }>('/auth/logout'),
  me: () => apiGet<Schema['SessionUser']>('/auth/me'),
  changePassword: (body: Schema['ChangePasswordRequest']) =>
    apiPost<Schema['ChangePasswordResult']>('/auth/change-password', body),
  init: () => apiPost<Schema['InitAdminResult']>('/auth/init'),

  users: (query?: ListQuery) => apiGetList<DashboardUser>('/users', query),
  createUser: (body: CreateUserRequest) => apiPost<DashboardUser>('/users', body),
  disableUser: (username: string) =>
    apiPost<DashboardUser>(`/users/${encodeURIComponent(username)}/disable`),
  enableUser: (username: string) =>
    apiPost<DashboardUser>(`/users/${encodeURIComponent(username)}/enable`),

  apiKeys: (query?: ListQuery) => apiGetList<ApiKeyInfo>('/api-keys', query),
  createApiKey: (body: CreateApiKeyRequest) => apiPost<ApiKeyCreated>('/api-keys', body),
  apiKey: (id: string) => apiGet<ApiKeyInfo>(`/api-keys/${encodeURIComponent(id)}`),
  deleteApiKey: (id: string) => apiDelete<{ ok?: boolean }>(`/api-keys/${encodeURIComponent(id)}`),

  audit: (query?: ListQuery & { action?: string; username?: string; success?: string }) =>
    apiGetList<AuditEvent>('/audit', query),

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
  pluginConfig: (node: number, name: string, reveal?: boolean) =>
    apiGet<unknown>(`/plugins/${node}/${encodeURIComponent(name)}/config`, reveal ? { reveal: '1' } : undefined),
  pluginConfigUpdate: (node: number, name: string, body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/plugins/${node}/${encodeURIComponent(name)}/config`, body, { apply }),
  pluginConfigValidate: (node: number, name: string, body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigValidateResult>(`/plugins/${node}/${encodeURIComponent(name)}/config/validate`, body, {
      apply,
    }),
  pluginConfigVersions: (node: number, name: string) =>
    apiGet<ConfigVersion[]>(`/plugins/${node}/${encodeURIComponent(name)}/config/versions`),
  pluginConfigRollback: (node: number, name: string, version: string, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>(
      `/plugins/${node}/${encodeURIComponent(name)}/config/rollback/${encodeURIComponent(version)}`,
      undefined,
      { apply },
    ),
  pluginReload: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/config/reload`),
  pluginLoad: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/load`),
  pluginUnload: (node: number, name: string) =>
    apiPut<boolean>(`/plugins/${node}/${encodeURIComponent(name)}/unload`),

  brokerConfig: (reveal?: boolean) =>
    apiGet<BrokerConfigOverview>('/broker/config', reveal ? { reveal: '1' } : undefined),
  brokerConfigSection: (section: BrokerConfigSection, reveal?: boolean) =>
    apiGet<Record<string, unknown>>(`/broker/config/${section}`, reveal ? { reveal: '1' } : undefined),
  brokerConfigSectionUpdate: (section: BrokerConfigSection, body: unknown) =>
    apiPut<ConfigWriteResult>(`/broker/config/${section}`, body),
  brokerConfigSectionValidate: (section: BrokerConfigSection, body: unknown) =>
    apiPost<ConfigValidateResult>(`/broker/config/${section}/validate`, body),
  brokerConfigVersions: () => apiGet<ConfigVersion[]>('/broker/config/versions'),
  brokerConfigRollback: (version: string) =>
    apiPost<ConfigWriteResult>(`/broker/config/rollback/${encodeURIComponent(version)}`),

  stats: () => apiGet<NodeStats[]>('/stats'),
  statsSum: () => apiGet<StatsSum>('/stats/sum'),
  statsHistory: (query?: HistoryQuery) => apiGet<HistoryCluster>('/stats/history', query),
  statsHistorySum: (query?: HistoryQuery) => apiGet<HistorySum>('/stats/history/sum', query),

  metrics: () => apiGet<NodeMetrics[]>('/metrics'),
  metricsSum: () => apiGet<Record<string, number>>('/metrics/sum'),
  metricsHistory: (query?: HistoryQuery) => apiGet<HistoryCluster>('/metrics/history', query),
  metricsHistorySum: (query?: HistoryQuery) => apiGet<HistorySum>('/metrics/history/sum', query),

  acl: (reveal?: boolean) => apiGet<AclOverview>('/acl', reveal ? { reveal: '1' } : undefined),
  aclUpdate: (body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>('/acl', body, { apply }),
  aclRules: (query?: ListQuery & { reveal?: boolean }) =>
    apiGetList<AclRule>('/acl/rules', query?.reveal ? { ...query, reveal: '1' } : query),
  aclRuleAdd: (body: AclRuleInput, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>('/acl/rules', body, { apply }),
  aclRuleUpdate: (index: number, body: AclRuleInput, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/acl/rules/${index}`, body, { apply }),
  aclRuleDelete: (index: number, apply: ConfigApplyMode = 'reload') =>
    apiDelete<ConfigWriteResult>(`/acl/rules/${index}`, { apply }),

  authProviders: () => apiGet<AuthProviderList>('/auth-providers'),
  authProvider: (name: string, reveal?: boolean) =>
    apiGet<AuthProviderDetail>(
      `/auth-providers/${encodeURIComponent(name)}`,
      reveal ? { reveal: '1' } : undefined,
    ),
  authProviderUpdate: (name: string, body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/auth-providers/${encodeURIComponent(name)}`, body, { apply }),
  authProviderTest: (name: string, body?: { url?: string }, allowPrivate?: boolean) =>
    apiPost<ConnectivityTest>(
      `/auth-providers/${encodeURIComponent(name)}/test`,
      body ?? {},
      allowPrivate ? { allow_private: '1' } : undefined,
    ),

  blacklist: () => apiGet<BlacklistGap>('/blacklist'),

  autoSubscriptions: (reveal?: boolean) =>
    apiGetOptional<PluginArrayList<AutoSubscription>>(
      '/auto-subscriptions',
      reveal ? { reveal: '1' } : undefined,
    ),
  autoSubscriptionAdd: (body: AutoSubscription, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>('/auto-subscriptions', body, { apply }),
  autoSubscriptionUpdate: (index: number, body: AutoSubscription, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/auto-subscriptions/${index}`, body, { apply }),
  autoSubscriptionDelete: (index: number, apply: ConfigApplyMode = 'reload') =>
    apiDelete<ConfigWriteResult>(`/auto-subscriptions/${index}`, { apply }),

  topicRewrites: (reveal?: boolean) =>
    apiGetOptional<PluginArrayList<TopicRewrite>>(
      '/topic-rewrites',
      reveal ? { reveal: '1' } : undefined,
    ),
  topicRewriteAdd: (body: TopicRewrite, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>('/topic-rewrites', body, { apply }),
  topicRewriteUpdate: (index: number, body: TopicRewrite, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/topic-rewrites/${index}`, body, { apply }),
  topicRewriteDelete: (index: number, apply: ConfigApplyMode = 'reload') =>
    apiDelete<ConfigWriteResult>(`/topic-rewrites/${index}`, { apply }),

  webhooks: (reveal?: boolean) =>
    apiGetOptional<WebhooksOverview>('/webhooks', reveal ? { reveal: '1' } : undefined),
  webhooksUpdate: (body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>('/webhooks', body, { apply }),
  webhookUrlAdd: (url: string, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>('/webhooks/urls', { url }, { apply }),
  webhookUrlDelete: (index: number, apply: ConfigApplyMode = 'reload') =>
    apiDelete<ConfigWriteResult>(`/webhooks/urls/${index}`, { apply }),
  webhookRuleAdd: (body: WebhookRule, apply: ConfigApplyMode = 'reload') =>
    apiPost<ConfigWriteResult>('/webhooks/rules', body, { apply }),
  webhookRuleUpdate: (hook: string, index: number, body: WebhookRule, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(
      `/webhooks/rules/${encodeURIComponent(hook)}/${index}`,
      body,
      { apply },
    ),
  webhookRuleDelete: (hook: string, index: number, apply: ConfigApplyMode = 'reload') =>
    apiDelete<ConfigWriteResult>(
      `/webhooks/rules/${encodeURIComponent(hook)}/${index}`,
      { apply },
    ),
  webhookTest: (body?: { url?: string }, allowPrivate?: boolean) =>
    apiPost<ConnectivityTest>(
      '/webhooks/test',
      body ?? {},
      allowPrivate ? { allow_private: '1' } : undefined,
    ),

  bridges: () => apiGet<BridgeList>('/bridges'),
  bridge: (plugin: string, reveal?: boolean) =>
    apiGet<BridgeDetail>(`/bridges/${encodeURIComponent(plugin)}`, reveal ? { reveal: '1' } : undefined),
  bridgeUpdate: (plugin: string, body: unknown, apply: ConfigApplyMode = 'reload') =>
    apiPut<ConfigWriteResult>(`/bridges/${encodeURIComponent(plugin)}`, body, { apply }),
  bridgeLoad: (plugin: string) =>
    apiPut<BridgeToggleResult>(`/bridges/${encodeURIComponent(plugin)}/load`),
  bridgeUnload: (plugin: string) =>
    apiPut<BridgeToggleResult>(`/bridges/${encodeURIComponent(plugin)}/unload`),

  alarms: (query?: ListQuery) => apiGet<AlarmList>('/alarms', query),
  alarmsHistory: (query?: ListQuery) => apiGet<AlarmList>('/alarms/history', query),
  acknowledgeAlarm: (id: string) =>
    apiPost<AlarmAckResult>(`/alarms/${encodeURIComponent(id)}/acknowledge`),

  logs: () => apiGetCapability<CapabilityGap>('/logs'),
  trace: () => apiGetCapability<CapabilityGap>('/trace'),
  slowSubs: () => apiGetCapability<CapabilityGap>('/slow-subs'),
  topicMetrics: (query?: ListQuery) => apiGet<TopicMetrics>('/topic-metrics', query),

  cluster: () => apiGet<ClusterTopology>('/cluster'),
  clusterJoin: () => clusterWrite('/cluster/join'),
  clusterLeave: () => clusterWrite('/cluster/leave'),
}

/** GET that treats HTTP 501 + `{ available:false }` / details as an honest gap. */
async function apiGetCapability<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    return await apiGet<T>(path, params)
  } catch (error) {
    if (error instanceof ApiError && error.status === 501) {
      const gap = parseCapabilityGap(error.details) ?? parseCapabilityGap(error.data)
      if (gap) return gap as T
    }
    throw error
  }
}

async function clusterWrite(path: string): Promise<ClusterWriteResult> {
  try {
    const data = await apiPost<unknown>(path)
    return parseClusterWriteResult(data) ?? { ok: true, available: true }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 501 || error.status === 502)) {
      const parsed = parseClusterWriteResult(error.details) ?? parseClusterWriteResult(error.data)
      if (parsed) return parsed
      return {
        ok: false,
        available: false,
        message: error.message,
        nodes: [],
      }
    }
    throw error
  }
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}
