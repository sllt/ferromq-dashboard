export type ApiEndpoint = {
  path: string
  name: string
  method: string
  descr: string
}

export type BrokerInfo = {
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
  node_name: string
  features: FeatureFlags
}

/** Unreachable nodes may appear as error strings (P1 FeaturesInfoOrError). */
export type FeatureNodeOrError = FeatureNode | string

export type FeatureConflict = {
  feature: string
  values: { value: boolean; node_ids: number[] }[]
}

export type FeaturesResponse = {
  consistent: boolean
  node_count: number
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
  node: number
  plugins: PluginInfo[]
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
