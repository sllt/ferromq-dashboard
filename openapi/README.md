# FerroMQ HTTP API OpenAPI

Vendored copy of the broker spec used by `pnpm gen:api`.

Upstream (dashboard/P6):
`ferromq-plugins/ferromq-http-api/openapi/openapi.json`
on branch `dashboard/p6-diagnostics-cluster` ([ferromq#7](https://github.com/sllt/ferromq/pull/7)).

Live broker:

- `GET /api/v1/openapi.json`
- Swagger UI: `GET /api/v1/docs`

## Refresh

```bash
# from a running broker (preferred)
pnpm gen:api:live

# or copy the checked-in broker file
# curl -sfL https://raw.githubusercontent.com/sllt/ferromq/dashboard/p6-diagnostics-cluster/ferromq-plugins/ferromq-http-api/openapi/openapi.json -o openapi/openapi.json
pnpm gen:api
```

`pnpm gen:api` writes `src/api/generated/schema.d.ts`. Commit both files after a refresh. `pnpm build` does not need a live broker.

This vendored copy keeps Bearer + `ferromq_session` cookie as one `securitySchemes` object so `openapi-typescript` can parse it.

## Contract the dashboard relies on

- Auth: `POST /auth/login` `{username,password}` → HttpOnly `ferromq_session` + `SessionUser`; `GET /auth/me`; `POST /auth/logout`; `POST /auth/change-password`; `POST /auth/init`
- Roles: `admin` (users / keys / audit / broker config write / `?reveal=1` + writes) | `operator` (kick / publish / plugin config write+reload) | `viewer` (read-only, secrets redacted)
- Admin: `GET/POST /users`, `POST /users/{username}/disable|enable`, `GET/POST /api-keys`, `DELETE /api-keys/{id}`, `GET /audit`, `PUT /broker/config/{section}`, `?reveal=1`, `allow_private=1`
- Config: `GET/PUT /plugins/{node}/{plugin}/config`, `POST .../validate`, `GET .../versions`, `POST .../rollback/{version}`; `GET /broker/config`, `GET/PUT /broker/config/{mqtt|listener|log}`
- P5: `/acl` `/acl/rules`, `/auth-providers/{http|jwt}` + `/test`, `/blacklist` (`available: false`), `/auto-subscriptions`, `/topic-rewrites`, `/webhooks` (+ `/test` TCP stub), `/bridges` + load/unload
- P6: `/alarms` (+ `/history`, acknowledge), `/logs` `/trace` `/slow-subs` (gaps), `/topic-metrics` (`kind=route_derived`), `/cluster` (read-only) + `/cluster/join` (always 501) + `/cluster/leave` (raft only)
- `Authorization: Bearer` is the static `http_bearer_token` or a created API key secret (`fmqk_…`, shown once)
- All `/api/v1` calls send cookies (`withCredentials` / `credentials: include`)
- Errors: `{ code, message, details?, request_id }` plus `X-Request-Id`
- Lists: default bare arrays; `?format=page` → `{ items, offset, limit, truncated, total? }`
- Headers: `X-Row-Count` / `X-Truncated`
- Paging aliases: `_limit`/`limit`, `_offset`/`offset`
- `/features`: `enabled` (OR across reachable nodes) for menu gating; `partial` / `failed_count`
- Cluster aggregates: HTTP 200 with per-node `{ ok, error? }`
