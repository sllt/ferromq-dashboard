#!/usr/bin/env node
/**
 * Pull live OpenAPI from a running FerroMQ HTTP API and overwrite the
 * vendored stub. Used by `pnpm gen:api:live`.
 *
 *   OPENAPI_URL=http://127.0.0.1:6060/api/v1/openapi.json pnpm gen:api:live
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = resolve(root, 'openapi/openapi.json')
const url = process.env.OPENAPI_URL || 'http://127.0.0.1:6060/api/v1/openapi.json'

const res = await fetch(url)
if (!res.ok) {
  const body = await res.text().catch(() => '')
  throw new Error(`GET ${url} failed: HTTP ${res.status} ${body.slice(0, 200)}`)
}

const spec = await res.json()
if (!spec || typeof spec !== 'object' || !spec.openapi) {
  throw new Error(`GET ${url} did not return an OpenAPI document`)
}

await writeFile(dest, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`wrote ${dest} from ${url} (OpenAPI ${spec.openapi})`)
