import type {
  Alarm,
  AlarmList,
  CapabilityAlternative,
  CapabilityGap,
  ClusterMember,
  ClusterMembership,
  ClusterMode,
  ClusterTopology,
  ClusterWriteNode,
  ClusterWriteResult,
  NodeClusterInfo,
  SysTopicInfo,
  TopicMetricItem,
  TopicMetrics,
} from './types'

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((v): v is string => typeof v === 'string')
}

function asNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const nums = value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return nums
}

export function parseAlarm(value: unknown): Alarm | null {
  const rec = asRecord(value)
  if (!rec) return null
  if (typeof rec.id !== 'string' || !rec.id) return null
  if (typeof rec.name !== 'string' || !rec.name) return null
  if (typeof rec.message !== 'string') return null
  if (typeof rec.source !== 'string') return null
  if (typeof rec.activated_at !== 'number') return null
  return {
    id: rec.id,
    name: rec.name,
    level: typeof rec.level === 'string' ? rec.level : 'warning',
    node_id: rec.node_id == null ? null : asNumber(rec.node_id) ?? null,
    message: rec.message,
    source: rec.source,
    activated_at: rec.activated_at,
    acknowledged: rec.acknowledged === true,
    acknowledged_at: asNumber(rec.acknowledged_at) ?? null,
    acknowledged_by: asString(rec.acknowledged_by) ?? null,
    cleared_at: asNumber(rec.cleared_at) ?? null,
  }
}

export function parseAlarmList(value: unknown): AlarmList | null {
  const rec = asRecord(value)
  if (!rec) return null
  const rawItems = rec.items
  if (!Array.isArray(rawItems)) return null
  const items = rawItems.map(parseAlarm).filter((a): a is Alarm => a != null)
  return {
    available: rec.available !== false,
    source: asString(rec.source),
    note: asString(rec.note),
    items,
    offset: asNumber(rec.offset),
    limit: asNumber(rec.limit),
    total: asNumber(rec.total),
    truncated: asBool(rec.truncated),
  }
}

export function parseCapabilityAlternative(value: unknown): CapabilityAlternative | null {
  const rec = asRecord(value)
  if (!rec) return null
  const api = asString(rec.api)
  const plugin = asString(rec.plugin)
  const how = asString(rec.how)
  if (!api && !plugin && !how) return null
  return { api, plugin, how }
}

export function parseCapabilityGap(value: unknown): CapabilityGap | null {
  const rec = asRecord(value)
  if (!rec) return null
  if (typeof rec.available !== 'boolean') return null
  const alternatives = Array.isArray(rec.alternatives)
    ? rec.alternatives.map(parseCapabilityAlternative).filter((a): a is CapabilityAlternative => a != null)
    : undefined
  return {
    available: rec.available,
    plugin: rec.plugin == null ? null : asString(rec.plugin) ?? null,
    kind: asString(rec.kind),
    items: Array.isArray(rec.items) ? rec.items : [],
    gap: asString(rec.gap),
    alternatives,
  }
}

export function parseTopicMetricItem(value: unknown): TopicMetricItem | null {
  const rec = asRecord(value)
  if (!rec || typeof rec.topic !== 'string') return null
  return {
    topic: rec.topic,
    subscribers: asNumber(rec.subscribers) ?? 0,
    node_ids: asNumberArray(rec.node_ids),
  }
}

export function parseSysTopic(value: unknown): SysTopicInfo | undefined {
  const rec = asRecord(value)
  if (!rec) return undefined
  return {
    plugin: asString(rec.plugin),
    loaded: asBool(rec.loaded),
    active: asBool(rec.active),
    topics: asStringArray(rec.topics),
  }
}

export function parseTopicMetrics(value: unknown): TopicMetrics | null {
  const rec = asRecord(value)
  if (!rec) return null
  if (typeof rec.available !== 'boolean') return null
  const rawItems = Array.isArray(rec.items) ? rec.items : []
  return {
    available: rec.available,
    kind: asString(rec.kind),
    note: asString(rec.note),
    sys_topic: parseSysTopic(rec.sys_topic),
    alternatives: Array.isArray(rec.alternatives)
      ? rec.alternatives.map(parseCapabilityAlternative).filter((a): a is CapabilityAlternative => a != null)
      : undefined,
    items: rawItems.map(parseTopicMetricItem).filter((i): i is TopicMetricItem => i != null),
    offset: asNumber(rec.offset),
    limit: asNumber(rec.limit),
    total: asNumber(rec.total),
    truncated: asBool(rec.truncated),
    source_truncated: asBool(rec.source_truncated),
  }
}

export function isClusterMode(value: unknown): value is ClusterMode {
  return value === 'standalone' || value === 'raft' || value === 'broadcast'
}

export function parseClusterMembership(value: unknown): ClusterMembership | undefined {
  const rec = asRecord(value)
  if (!rec) return undefined
  return {
    join: asBool(rec.join),
    leave: asBool(rec.leave),
    reason: asString(rec.reason),
  }
}

export function parseClusterMember(value: unknown): ClusterMember | null {
  const rec = asRecord(value)
  if (!rec) return null
  const nodeId = asNumber(rec.node_id)
  if (nodeId == null) return null
  return {
    ok: rec.ok !== false,
    node_id: nodeId,
    role: asString(rec.role),
    reachable: asBool(rec.reachable),
    leader: asBool(rec.leader),
    error: asString(rec.error),
  }
}

export function parseClusterTopology(value: unknown): ClusterTopology | null {
  const rec = asRecord(value)
  if (!rec) return null
  if (typeof rec.available !== 'boolean') return null
  const local = asNumber(rec.local_node_id)
  if (local == null) return null
  const mode = asString(rec.mode)
  if (!mode) return null
  return {
    available: rec.available,
    mode,
    plugin: rec.plugin == null ? null : asString(rec.plugin) ?? null,
    plugin_active: asBool(rec.plugin_active),
    local_node_id: local,
    leader_id: rec.leader_id == null ? null : asNumber(rec.leader_id) ?? null,
    role: asString(rec.role),
    peers: asNumberArray(rec.peers),
    nodes: Array.isArray(rec.nodes)
      ? rec.nodes.map(parseClusterMember).filter((n): n is ClusterMember => n != null)
      : undefined,
    membership: parseClusterMembership(rec.membership),
    raft: rec.raft,
    note: asString(rec.note),
  }
}

export function parseClusterWriteNode(value: unknown): ClusterWriteNode | null {
  const rec = asRecord(value)
  if (!rec) return null
  return {
    ok: asBool(rec.ok),
    node_id: asNumber(rec.node_id),
    error: asString(rec.error),
    result: rec.result,
  }
}

export function parseClusterWriteResult(value: unknown): ClusterWriteResult | null {
  const rec = asRecord(value)
  if (!rec) return null
  if (rec.ok == null && rec.action == null && rec.nodes == null && rec.available == null) return null
  return {
    ok: asBool(rec.ok),
    action: asString(rec.action),
    available: asBool(rec.available),
    message: asString(rec.message),
    membership: parseClusterMembership(rec.membership),
    nodes: Array.isArray(rec.nodes)
      ? rec.nodes.map(parseClusterWriteNode).filter((n): n is ClusterWriteNode => n != null)
      : undefined,
  }
}

export function parseNodeCluster(value: unknown): NodeClusterInfo | undefined {
  const rec = asRecord(value)
  if (!rec) return undefined
  const mode = asString(rec.mode)
  const role = asString(rec.role)
  const plugin = rec.plugin == null ? null : asString(rec.plugin) ?? null
  if (!mode && !role && plugin == null && rec.leader_id == null && rec.peers == null) return undefined
  return {
    mode,
    plugin,
    plugin_active: asBool(rec.plugin_active),
    leader_id: rec.leader_id == null ? null : asNumber(rec.leader_id) ?? null,
    role,
    peers: asNumberArray(rec.peers),
  }
}

export type GapRoute =
  | '/'
  | '/broker-config'
  | '/clients'
  | '/subscriptions'
  | '/routes'
  | '/nodes'
  | '/acl'
  | '/auth-providers'

export type GapLink = {
  to: GapRoute
  search?: { section?: 'mqtt' | 'listener' | 'log' }
  labelKey: string
}

/** Map backend alternative.api strings to dashboard routes. */
export function alternativeLink(alt: CapabilityAlternative): GapLink | null {
  const api = (alt.api ?? '').toLowerCase()
  const plugin = (alt.plugin ?? '').toLowerCase()
  if (api.includes('/broker/config/log') || api.includes('/broker/config')) {
    return { to: '/broker-config', search: { section: 'log' }, labelKey: 'nav.brokerConfig' }
  }
  if (api.includes('/clients') || api.includes('/client')) {
    return { to: '/clients', labelKey: 'nav.clients' }
  }
  if (api.includes('/subscriptions')) {
    return { to: '/subscriptions', labelKey: 'nav.subscriptions' }
  }
  if (api.includes('/routes')) {
    return { to: '/routes', labelKey: 'nav.routes' }
  }
  if (api.includes('/metrics') || api.includes('/stats')) {
    return { to: '/', labelKey: 'nav.overview' }
  }
  if (api.includes('/nodes') || api.includes('/health')) {
    return { to: '/nodes', labelKey: 'nav.nodes' }
  }
  if (api.includes('/acl') || plugin.includes('acl')) {
    return { to: '/acl', labelKey: 'nav.acl' }
  }
  if (plugin.includes('auth')) {
    return { to: '/auth-providers', labelKey: 'nav.authProviders' }
  }
  return null
}
