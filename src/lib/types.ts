import type { UserRole } from '@/lib/session-user'

export type { AuthKind, SessionUser, UserRole } from '@/lib/session-user'

export type LoginRequest = {
  username: string
  password: string
}

export type ChangePasswordRequest = {
  old_password: string
  new_password: string
}

export type DashboardUser = {
  username: string
  role: UserRole
  enabled: boolean
}

export type CreateUserRequest = {
  username: string
  password: string
  role: UserRole
}

export type ApiKeyInfo = {
  id: string
  name: string
  role: UserRole
  created_at: number
  created_by: string
  last_used_at?: number | null
}

export type ApiKeyCreated = ApiKeyInfo & {
  secret: string
}

export type CreateApiKeyRequest = {
  name: string
  role?: UserRole
}

export type AuditEvent = {
  id: number
  ts: number
  request_id: string
  username: string
  role: string
  auth: string
  action: string
  resource?: string
  ip: string
  success: boolean
  details?: Record<string, unknown>
}

export type ApiEndpoint = {
  path: string
  name: string
  method: string
  descr: string
}

export type BrokerInfo = {
  ok?: boolean
  datetime?: string
  node_id: number
  node_name: string
  running: boolean
  sysdescr?: string
  uptime?: string
  version?: string
  rustc_version?: string
}

export type NodeInfo = {
  ok?: boolean
  boottime?: string
  connections?: number
  disk_free?: number
  disk_total?: number
  load1?: number
  load5?: number
  load15?: number
  memory_free?: number
  memory_total?: number
  memory_used?: number
  node_id: number
  node_name: string
  running: boolean
  uptime?: string
  version?: string
  rustc_version?: string
}

export type FeatureFlags = {
  retain?: boolean
  message_storage?: boolean
  session_storage?: boolean
  delayed?: boolean
  shared_subscription?: boolean
  auto_subscription?: boolean
}

export type FeatureNode = {
  node_id: number
  node_name?: string
  ok?: boolean
  features?: FeatureFlags
  error?: string
}

/** P2 `{ ok, error? }` or P1 bare error string. */
export type FeatureNodeOrError = FeatureNode | string

export type FeatureConflict = {
  feature: string
  values: { value: boolean; node_ids: number[] }[]
}

export type FeaturesResponse = {
  consistent: boolean
  node_count: number
  failed_count?: number
  partial?: boolean
  /** OR of flags across reachable nodes — preferred for menu gating. */
  enabled?: FeatureFlags
  conflicts: FeatureConflict[]
  nodes: FeatureNodeOrError[]
}

export type NodeHealth = {
  /** Actual FerroMQ JSON uses node_id; docs/legacy used name. */
  node_id?: number
  name?: string
  running: boolean
  uptime?: string
  /** Docs/legacy field; live broker uses running (+ optional descr). */
  status?: string
  leader_id?: number
  descr?: string
}

/**
 * Live FerroMQ (HealthInfo::to_json) returns:
 *   { running: bool, nodes: [{ node_id, running, ... }] }
 * Older docs/RMQTT-style responses used:
 *   { status: "Running", nodes: { "1": { name, running, uptime, status } } }
 */
export type HealthCheck = {
  status?: string
  running?: boolean
  descr?: string
  nodes: Record<string, NodeHealth> | NodeHealth[]
}

export type LastWill = {
  message?: string
  qos?: number
  retain?: boolean
  topic?: string
}

export type ClientInfo = {
  node_id: number
  clientid: string
  username?: string
  superuser?: boolean
  proto_ver?: number
  ip_address?: string
  port?: number
  connected_at?: string
  disconnected_at?: string
  disconnected_reason?: string
  connected: boolean
  keepalive?: number
  clean_start?: boolean
  session_present?: boolean
  expiry_interval?: number
  created_at?: string
  subscriptions_cnt?: number
  max_subscriptions?: number
  inflight?: number
  max_inflight?: number
  mqueue_len?: number
  max_mqueue?: number
  last_will?: LastWill | null
}

export type ClientQuery = {
  _limit?: number
  limit?: number
  offset?: number
  _offset?: number
  clientid?: string
  username?: string
  ip_address?: string
  connected?: boolean
  clean_start?: boolean
  session_present?: boolean
  proto_ver?: number
  _like_clientid?: string
  _like_username?: string
  _gte_created_at?: string
  _lte_created_at?: string
  _gte_connected_at?: string
  _lte_connected_at?: string
  _gte_mqueue_len?: number
  _lte_mqueue_len?: number
}

export type SubscriptionInfo = {
  node_id: number
  clientid: string
  client_addr?: string
  topic: string
  qos: number
  share?: string | null
}

export type RouteInfo = {
  topic: string
  node_id: number
}

export type RetainFrom = {
  typ?: string
  id?: {
    node_id?: number
    client_id?: string
  }
}

export type RetainPublish = {
  topic?: string
  qos?: number
  retain?: boolean
  dup?: boolean
  payload?: string
  create_time?: number
  properties?: Record<string, unknown> | null
}

export type RetainItem = {
  topic: string
  msg_id?: number
  from?: RetainFrom
  publish?: RetainPublish
  remaining_ttl?: number | null
  client_id?: string
}

export type RetainsResponse = {
  items: RetainItem[]
  has_more: boolean
}

export type PublishRequest = {
  topic?: string
  topics?: string
  clientid?: string
  payload: string
  encoding?: 'plain' | 'base64'
  qos?: number
  retain?: boolean
  properties?: {
    message_expiry_interval?: number
    topic_alias?: number
    response_topic?: string
    correlation_data?: string
    user_properties?: Record<string, string>
  }
}

export type PluginInfo = {
  name: string
  version?: string | null
  descr?: string | null
  authors?: string | string[] | null
  homepage?: string | null
  license?: string | null
  repository?: string | null
  active: boolean
  inited: boolean
  immutable: boolean
  attrs?: unknown
}

export type NodePlugins = {
  ok?: boolean
  node: number
  plugins: PluginInfo[]
  error?: string
}

export type StatsNode = {
  id: number
  name: string
  running?: boolean
}

export type StatsMap = Record<string, number>

export type NodeStats = {
  node: StatsNode
  stats: StatsMap
}

export type StatsSum = {
  nodes: Record<string, { name: string; running: boolean }>
  stats: StatsMap
}

export type HistoryPoint = {
  ts: number
  [key: string]: number
}

export type HistoryNode = {
  from: number
  to: number
  node: number
  count: number
  data: HistoryPoint[]
}

export type HistoryCluster = {
  from: number
  to: number
  nodes: Record<string, HistoryNode>
}

export type HistorySum = {
  from: number
  to: number
  node_count: number
  count: number
  data: HistoryPoint[]
}

export type NodeMetrics = {
  node: { id: number; name: string }
  metrics: Record<string, number>
}

export type HistoryQuery = {
  minutes?: number
  hours?: number
  days?: number
  limit?: number
  merge_window?: number
}

export type { PageResult } from '@/lib/list'

export type EffectiveMode = 'hot' | 'reload' | 'restart_required'

export type ConfigApplyMode = 'reload' | 'none'

export type BrokerConfigSection = 'mqtt' | 'listener' | 'log'

export type ConfigDiff = {
  added?: string[]
  removed?: string[]
  changed?: string[]
}

export type ConfigWriteResult = {
  ok: boolean
  written: boolean
  applied: boolean
  effective: EffectiveMode
  diff: ConfigDiff
  backup?: string | null
  apply_error?: string | null
  plugin?: string
  node?: number
  section?: string
  note?: string
}

export type ConfigValidateResult = {
  ok: boolean
  valid: boolean
  effective: EffectiveMode
  diff: ConfigDiff
  errors?: string[]
  plugin?: string
  node?: number
  section?: string
  note?: string
}

export type ConfigVersion = {
  version: string
  ts: number
  size: number
}

export type BrokerConfigOverview = {
  file?: string
  writable_sections?: string[]
  effective?: EffectiveMode
  note?: string
  mqtt?: Record<string, unknown>
  listener?: Record<string, unknown>
  log?: Record<string, unknown>
}

export type AclAccess = 'allow' | 'deny'
export type AclControl = 'all' | 'connect' | 'publish' | 'subscribe' | 'pubsub'

export type AclWhoObject = {
  user?: string
  password?: string
  superuser?: boolean
  clientid?: string
  ipaddr?: string
  protocol?: number
}

export type AclWho = 'all' | AclWhoObject

export type AclTopic = string | { eq: string }

export type AclRule = {
  index: number
  access: string
  who: unknown
  control: string
  topics?: AclTopic[]
  raw?: unknown
}

export type AclRuleInput = {
  access?: AclAccess
  who?: AclWho
  control?: AclControl
  topics?: AclTopic[]
  raw?: unknown
  index?: number
}

export type AclOverview = {
  plugin?: string
  node?: number
  available?: boolean
  active?: boolean
  inited?: boolean
  reloadable?: boolean | null
  disconnect_if_pub_rejected?: boolean
  priority?: number
  rules?: AclRule[]
  note?: string
}

export type AuthProviderKind = 'http' | 'jwt'

export type AuthProviderInfo = {
  name: string
  kind: string
  node?: number
  available?: boolean
  active?: boolean
  inited?: boolean
  reloadable?: boolean | null
  attrs?: unknown
}

export type AuthProviderList = {
  node?: number
  providers?: AuthProviderInfo[]
  note?: string
}

export type AuthProviderDetail = AuthProviderInfo & {
  config?: Record<string, unknown>
  note?: string
}

export type ConnectivityTest = {
  ok: boolean
  kind?: string
  plugin?: string
  url?: string
  host?: string
  port?: number
  latency_ms?: number | null
  error?: string | null
  note?: string
  encrypt?: string
  public_key?: string
}

export type BlacklistAlternative = {
  plugin?: string
  how?: string
}

export type BlacklistGap = {
  available: boolean
  plugin?: string | null
  items?: unknown[]
  gap?: string
  alternatives?: BlacklistAlternative[]
}

export type PluginArrayList<T> = {
  plugin?: string
  node?: number
  available?: boolean
  active?: boolean
  inited?: boolean
  reloadable?: boolean | null
  items?: T[]
  missing?: boolean
}

export type AutoSubscription = {
  index?: number
  topic_filter: string
  qos: number
  no_local?: boolean
  retain_as_published?: boolean
  retain_handling?: number
}

export type TopicRewrite = {
  index?: number
  action: string
  source_topic_filter: string
  dest_topic: string
  regex?: string
}

export type WebhookRule = {
  hook?: string
  index?: number
  action?: string
  urls?: string[]
  topics?: string[]
  value?: unknown
}

export type WebhooksOverview = {
  plugin?: string
  node?: number
  available?: boolean
  active?: boolean
  inited?: boolean
  reloadable?: boolean | null
  attrs?: unknown
  queue_capacity?: unknown
  concurrency_limit?: unknown
  http_timeout?: unknown
  retry_max_elapsed_time?: unknown
  retry_multiplier?: unknown
  urls?: string[]
  rules?: WebhookRule[]
  note?: string
  missing?: boolean
}

export type BridgeKind = {
  direction?: string
  transport?: string
}

export type BridgeInfo = {
  name: string
  kind?: BridgeKind
  node?: number
  available?: boolean
  active?: boolean
  inited?: boolean
  immutable?: boolean
  reloadable?: boolean | null
  attrs?: unknown
}

export type BridgeList = {
  node?: number
  items?: BridgeInfo[]
  note?: string
}

export type BridgeDetail = BridgeInfo & {
  config?: Record<string, unknown>
  note?: string
}

export type BridgeToggleResult = {
  ok?: boolean
  name?: string
  node?: number
  loaded?: boolean
}

export const ACL_CONTROLS: AclControl[] = ['all', 'connect', 'publish', 'subscribe', 'pubsub']

export const REWRITE_ACTIONS = ['all', 'publish', 'subscribe'] as const

export const WEBHOOK_HOOKS = [
  'session_created',
  'session_terminated',
  'session_subscribed',
  'session_unsubscribed',
  'client_connect',
  'client_connack',
  'client_connected',
  'client_disconnected',
  'client_subscribe',
  'client_unsubscribe',
  'message_publish',
  'message_delivered',
  'message_acked',
  'message_dropped',
  'offline_message',
  'keepalive',
  'offline_inflight_messages',
  'message_expiry_check',
  'before_startup',
  'grpc_message_received',
] as const
