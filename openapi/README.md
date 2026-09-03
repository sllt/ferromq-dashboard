# FerroMQ HTTP API OpenAPI stub

This folder vendors an OpenAPI 3.1 document that mirrors the current
FerroMQ dashboard surface (`/api/v1`).

CI and local `pnpm gen:api` read **this checked-in file**. Live broker
codegen is optional and is **not** required for `pnpm build`.

## Refresh from a running broker

When `ferromq-http-api` serves `GET /api/v1/openapi.json` (dashboard/P2
backend), replace the stub:

```bash
# default: http://127.0.0.1:6060/api/v1/openapi.json
pnpm gen:api:live

# or manually
curl -sf http://127.0.0.1:6060/api/v1/openapi.json -o openapi/openapi.json
pnpm gen:api
```

`pnpm gen:api` always compiles `openapi/openapi.json` into
`src/api/generated/schema.d.ts`. Commit both the spec and the generated
types after a refresh.

## Error and list contract (P1 + P2)

- Errors: JSON `{ "code", "message", "details"?, "request_id"? }`
- List endpoints: `X-Row-Count` / `X-Truncated`
- Paging aliases: `_limit` / `limit`, `_offset` / `offset`
- Optional `?format=page` → `{ items, row_count?, truncated?, offset?, limit?, has_more? }`
  The dashboard prefers this shape and falls back to a bare array.
