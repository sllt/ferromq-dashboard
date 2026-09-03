# FerroMQ HTTP API OpenAPI

Vendored copy of the broker spec used by `pnpm gen:api`.

Upstream (dashboard/P3a):
`ferromq-plugins/ferromq-http-api/openapi/openapi.json`
on branch `dashboard/p3a-session-auth` ([ferromq#3](https://github.com/sllt/ferromq/pull/3)).

Live broker:

- `GET /api/v1/openapi.json`
- Swagger UI: `GET /api/v1/docs`

## Refresh

```bash
# from a running broker (preferred)
pnpm gen:api:live

# or copy the checked-in broker file
# curl -sfL https://raw.githubusercontent.com/sllt/ferromq/dashboard/p3a-session-auth/ferromq-plugins/ferromq-http-api/openapi/openapi.json -o openapi/openapi.json
pnpm gen:api
```

`pnpm gen:api` writes `src/api/generated/schema.d.ts`. Commit both files after a refresh. `pnpm build` does not need a live broker.

The broker file on PR3 currently duplicates `components.securitySchemes`. This vendored copy merges Bearer + `ferromq_session` cookie into a single key so `openapi-typescript` can parse it.

## Contract the dashboard relies on

- Auth: `POST /auth/login` `{username,password}` → HttpOnly `ferromq_session` + `SessionUser`; `GET /auth/me`; `POST /auth/logout`; `POST /auth/change-password`; `POST /auth/init`
- Roles: `admin` | `viewer` (viewer cannot kick / publish / plugin load)
- `Authorization: Bearer <http_bearer_token>` remains an operator/admin fallback
- All `/api/v1` calls send cookies (`withCredentials` / `credentials: include`)
- Errors: `{ code, message, details?, request_id }` plus `X-Request-Id`
- Lists: default bare arrays; `?format=page` → `{ items, offset, limit, truncated, total? }`
- Headers: `X-Row-Count` / `X-Truncated`
- Paging aliases: `_limit`/`limit`, `_offset`/`offset`
- `/features`: `enabled` (OR across reachable nodes) for menu gating; `partial` / `failed_count`
- Cluster aggregates: HTTP 200 with per-node `{ ok, error? }`
