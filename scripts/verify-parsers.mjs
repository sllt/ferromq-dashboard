/**
 * Contract checks for P2 list/error parsers (real modules, no HTTP mocks).
 */
import { parseErrorBody } from '../src/lib/api-error.ts'
import {
  collectSecretFields,
  countRedactedSecrets,
  isAclPlugin,
  isSecretKey,
  parseConfigValidateResult,
  parseJsonObject,
  stripRedactedSecrets,
} from '../src/lib/config.ts'
import { parseListResponse } from '../src/lib/list-parse.ts'
import { canAdmin, canWrite, parseSessionUser } from '../src/lib/session-user.ts'
import {
  alternativeLink,
  parseAlarm,
  parseAlarmList,
  parseCapabilityGap,
  parseClusterTopology,
  parseClusterWriteResult,
  parseNodeCluster,
  parseTopicMetrics,
} from '../src/lib/diagnostics.ts'

let failed = 0
function assert(name, cond) {
  if (!cond) {
    failed += 1
    console.error(`FAIL ${name}`)
  } else {
    console.log(`ok   ${name}`)
  }
}

const headers = { 'x-row-count': '50', 'x-truncated': 'true' }
const arr = parseListResponse([{ clientid: 'a' }, { clientid: 'b' }], headers, { _limit: 50, offset: 0 })
assert('array + X-Row-Count/X-Truncated', arr.format === 'array' && arr.rowCount === 50 && arr.truncated === true && arr.items.length === 2)

const page = parseListResponse(
  { items: [{ topic: 't' }], offset: 10, limit: 10, truncated: false, total: 42 },
  { 'x-row-count': '1' },
  { _limit: 10, offset: 10 },
)
assert(
  'format=page official',
  page.format === 'page' &&
    page.total === 42 &&
    page.rowCount === 1 &&
    page.offset === 10 &&
    page.truncated === false &&
    page.items[0].topic === 't',
)

const retains = parseListResponse({ items: [{ topic: 'a' }], has_more: true }, { 'X-Row-Count': '1' }, { limit: 50, offset: 0 })
assert('retains {items,has_more}', retains.format === 'items' && retains.truncated === true && retains.items.length === 1)

const empty = parseListResponse([], { 'x-row-count': '0', 'x-truncated': 'false' }, { _limit: 50, offset: 0 })
assert('empty array', empty.items.length === 0 && empty.rowCount === 0 && empty.truncated === false)

const body = parseErrorBody({ code: 404, message: 'plugin not found', request_id: 'req-1', details: { name: 'x' } })
assert('error {code,message,request_id}', body?.code === 404 && body?.message === 'plugin not found' && body?.request_id === 'req-1')
assert('error ignore non-object', parseErrorBody('nope') === null)
assert('error ignore array', parseErrorBody([]) === null)

const session = parseSessionUser({ username: 'admin', role: 'admin', auth: 'session', expires_in: 1800 })
assert('session user', session?.username === 'admin' && session.role === 'admin' && session.auth === 'session' && canWrite(session))
const viewer = parseSessionUser({ username: 'ops', role: 'viewer', auth: 'session' })
assert('viewer cannot write', viewer?.role === 'viewer' && canWrite(viewer) === false)
assert('reject missing role', parseSessionUser({ username: 'x', auth: 'session' }) === null)
assert('reject password leak shape', parseSessionUser({ username: 'a', role: 'admin', auth: 'session', password: 'secret' })?.username === 'a')
assert('anonymous admin can write', canWrite({ username: 'anonymous', role: 'admin', auth: 'anonymous' }))
const ops = parseSessionUser({ username: 'ops', role: 'operator', auth: 'session' })
assert('operator can write but not admin', ops?.role === 'operator' && canWrite(ops) === true && canAdmin(ops) === false)
assert('admin can admin', canAdmin({ username: 'admin', role: 'admin', auth: 'session' }) === true)
assert('api_key auth', parseSessionUser({ username: 'ci', role: 'operator', auth: 'api_key', key_id: 'k1' })?.auth === 'api_key')

assert('secret http_bearer_token', isSecretKey('http_bearer_token'))
assert('secret jwt_key', isSecretKey('jwt_key'))
assert('not secret http_laddr', isSecretKey('http_laddr') === false)
assert('not secret max_sessions', isSecretKey('max_sessions') === false)
const redacted = {
  http_laddr: '0.0.0.0:6060',
  http_bearer_token: '***',
  nested: { password: '***', ok: 1 },
}
assert('count redacted', countRedactedSecrets(redacted) === 2)
const stripped = stripRedactedSecrets(redacted)
assert(
  'strip redacted secrets',
  stripped.http_laddr === '0.0.0.0:6060' &&
    stripped.http_bearer_token === undefined &&
    stripped.nested.password === undefined &&
    stripped.nested.ok === 1,
)
assert('secret fields include path', collectSecretFields(redacted).some((f) => f.path === 'http_bearer_token' && f.redacted))
assert('parse json object', parseJsonObject('{"a":1}').ok === true && parseJsonObject('[1]').ok === false)
assert('acl plugin name', isAclPlugin('ferromq-acl') && !isAclPlugin('ferromq-http-api'))
const vr = parseConfigValidateResult({
  ok: true,
  valid: true,
  effective: 'restart_required',
  diff: { changed: ['mqtt.max_sessions'] },
  note: 'file only',
})
assert('validate result', vr?.valid === true && vr.effective === 'restart_required' && vr.diff.changed?.[0] === 'mqtt.max_sessions')
assert('reject validate noise', parseConfigValidateResult({ message: 'bad' }) === null)

const alarm = parseAlarm({
  id: 'node_unhealthy:2',
  name: 'node_unhealthy',
  level: 'critical',
  node_id: 2,
  message: 'node 2 is not running',
  source: 'health',
  activated_at: 1_700_000_000_000,
  acknowledged: false,
})
assert('alarm current', alarm?.id === 'node_unhealthy:2' && alarm.acknowledged === false && alarm.level === 'critical')
assert('reject alarm noise', parseAlarm({ id: 'x' }) === null)

const alarmList = parseAlarmList({
  available: true,
  source: 'derived',
  note: 'in-memory',
  items: [alarm, { nope: true }],
})
assert('alarm list drops junk', alarmList?.available === true && alarmList.items.length === 1 && alarmList.source === 'derived')

const logsGap = parseCapabilityGap({
  available: false,
  plugin: null,
  kind: 'logs',
  items: [],
  gap: 'no collector',
  alternatives: [{ api: 'GET /api/v1/broker/config/log', how: 'read log.level' }],
})
assert('logs gap', logsGap?.available === false && logsGap.kind === 'logs' && logsGap.alternatives?.[0].api?.includes('broker/config/log'))
assert('gap link broker log', alternativeLink(logsGap.alternatives[0])?.to === '/broker-config')
assert('gap link subscriptions', alternativeLink({ api: 'GET /api/v1/subscriptions' })?.to === '/subscriptions')
assert('reject gap without available', parseCapabilityGap({ gap: 'x' }) === null)

const topicMetrics = parseTopicMetrics({
  available: true,
  kind: 'route_derived',
  note: 'not rates',
  sys_topic: { plugin: 'ferromq-sys-topic', loaded: false, active: false, topics: [] },
  items: [{ topic: 'a/b', subscribers: 3, node_ids: [1] }, { bad: true }],
  offset: 0,
  limit: 50,
  truncated: false,
})
assert(
  'topic metrics route_derived',
  topicMetrics?.available === true &&
    topicMetrics.kind === 'route_derived' &&
    topicMetrics.items.length === 1 &&
    topicMetrics.items[0].subscribers === 3 &&
    topicMetrics.sys_topic?.active === false,
)

const standalone = parseClusterTopology({
  available: true,
  mode: 'standalone',
  plugin: null,
  plugin_active: false,
  local_node_id: 1,
  leader_id: null,
  role: 'standalone',
  peers: [],
  nodes: [{ ok: true, node_id: 1, role: 'standalone', reachable: true, leader: false }],
  membership: { join: false, leave: false, reason: 'no plugin' },
})
assert(
  'cluster standalone',
  standalone?.mode === 'standalone' &&
    standalone.membership?.join === false &&
    standalone.membership?.leave === false &&
    standalone.nodes?.[0].node_id === 1,
)

const raft = parseClusterTopology({
  available: true,
  mode: 'raft',
  plugin: 'ferromq-cluster-raft',
  plugin_active: true,
  local_node_id: 1,
  leader_id: 1,
  role: 'leader',
  peers: [2],
  nodes: [
    { ok: true, node_id: 1, role: 'leader', reachable: true, leader: true },
    { ok: true, node_id: 2, role: 'follower', reachable: true, leader: false },
  ],
  membership: { join: false, leave: true, reason: 'raft leave only' },
})
assert('cluster raft leave', raft?.mode === 'raft' && raft.membership?.leave === true && raft.membership?.join === false)

const join501 = parseClusterWriteResult({
  ok: false,
  action: 'join',
  available: false,
  message: 'runtime join is not supported',
  nodes: [{ ok: false, node_id: 1, error: 'runtime join is not supported' }],
})
assert('cluster join 501 details', join501?.ok === false && join501.action === 'join' && join501.nodes?.[0].ok === false)

const leaveOk = parseClusterWriteResult({
  ok: true,
  action: 'leave',
  available: true,
  nodes: [{ ok: true, node_id: 1, result: { op: 'leave' } }],
})
assert('cluster leave ok', leaveOk?.ok === true && leaveOk.nodes?.[0].result?.op === 'leave')

const nodeCluster = parseNodeCluster({ mode: 'raft', plugin: 'ferromq-cluster-raft', leader_id: 1, role: 'follower', peers: [1, 2] })
assert('node cluster extra field', nodeCluster?.mode === 'raft' && nodeCluster.role === 'follower' && nodeCluster.leader_id === 1)
assert('node without cluster stays undefined', parseNodeCluster({ connections: 3 }) === undefined)
assert('reject topology without local id', parseClusterTopology({ available: true, mode: 'raft' }) === null)

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all parser checks passed')
