# FerroMQ HTTP API OpenAPI

Vendored copy of the broker spec used by `pnpm gen:api`.

Upstream (dashboard/P2):
`ferromq-plugins/ferromq-http-api/openapi/openapi.json`
on branch `dashboard/p2-openapi-contract` ([ferromq#2](https://github.com/sllt/ferromq/pull/2)).

Live broker:

- `GET /api/v1/openapi.json`
- Swagger UI: `GET /api/v1/docs`

## Refresh

```bash
# from a running broker (preferred)
pnpm gen:api:live

# or copy the checked-in broker file
# curl -sfL https://raw.githubusercontent.com/sllt/ferromq/dashboard/p2-openapi-contract/ferromq-plugins/ferromq-http-api/openapi/openapi.json -o openapi/openapi.json
pnpm gen:api
```

`pnpm gen:api` writes `src/api/generated/schema.d.ts`. Commit both files after a refresh. `pnpm build` does not need a live broker.

## Contract the dashboard relies on

- Errors: `{ code, message, details?, request_id }` plus `X-Request-Id`
- Lists: default bare arrays; `?format=page` → `{ items, offset, limit, truncated, total? }`
- Headers: `X-Row-Count` / `X-Truncated`
- Paging aliases: `_limit`/`limit`, `_offset`/`offset`
- `/features`: `enabled` (OR across reachable nodes) for menu gating; `partial` / `failed_count`
- Cluster aggregates: HTTP 200 with per-node `{ ok, error? }`
