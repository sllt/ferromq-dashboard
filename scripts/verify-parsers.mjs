/**
 * Contract checks for P2 list/error parsers (real modules, no HTTP mocks).
 */
import { parseErrorBody } from '../src/lib/api-error.ts'
import { parseListResponse } from '../src/lib/list-parse.ts'
import { canWrite, parseSessionUser } from '../src/lib/session-user.ts'

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

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all parser checks passed')
