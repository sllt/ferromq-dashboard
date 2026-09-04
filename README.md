# FerroMQ Dashboard

FerroMQ HTTP API (`/api/v1`) 的运维控制台。基于 React 19、Vite、TypeScript、shadcn/ui、Tailwind CSS、TanStack Router / Query / Table、Zustand 与 Recharts。

界面结构参考 [shadcn-admin](https://github.com/satnaing/shadcn-admin)（MIT）。**不包含** Clerk / faker 演示应用，所有页面只请求真实 `/api/v1`。

## 功能

| 页面 | API |
| --- | --- |
| 登录 | `POST /auth/login` 用户名/密码 → HttpOnly `ferromq_session`；启动时 `GET /auth/me`；可选 Bearer 回退 |
| 总览 | `/stats` `/stats/sum` `/metrics` `/metrics/sum`，以及可用时的 `/stats/history/sum` `/metrics/history/sum`；`/nodes` `/brokers` |
| 节点 | `/nodes` `/brokers` `/health/check` `/features` |
| 客户端 | `/clients`、详情、`DELETE /clients/{id}`、离线列表与批量踢出 |
| 订阅 | `/subscriptions` |
| 路由 | `/routes` |
| 保留消息 | `/retains`、`DELETE /retains?topic=` |
| 发布 | `POST /mqtt/publish` |
| 插件 | 集群 JSON `[{node, plugins:[...]}]`；`load` / `unload` / `config/reload`；配置 JSON 编辑、校验、版本与回滚 |
| Broker 配置 | `GET /broker/config` 概览；编辑 mqtt / listener / log（仅 admin 写入，一律 `restart_required`） |
| ACL | `/acl` `/acl/rules` 结构化规则 CRUD；密码默认 `***`，`?reveal=1` 仅 admin |
| 认证插件 | `/auth-providers/{http\|jwt}` 配置 + `POST .../test`（HTTP 为 TCP 探测，JWT 为本地校验） |
| 自动订阅 / 主题改写 | `/auto-subscriptions` `/topic-rewrites` 按索引增删改 |
| Webhooks | `/webhooks` URL 与规则；`POST /webhooks/test` 为 TCP stub（无 HTTP POST） |
| 桥接 | `/bridges` 列表 / 状态 / 配置 / load / unload |
| 黑名单 | `GET /blacklist`：`available: false` 时展示缺口说明与 ACL 替代 |
| 告警 | `GET /alarms` `/alarms/history`，`POST /alarms/{id}/acknowledge`（operator+）。推导的内存总线，重启丢失 |
| 日志 / 追踪 / 慢订阅 | `GET /logs` `/trace` `/slow-subs`：`available: false` 或 501 的诚实缺口，不编造指标 |
| 主题指标 | `GET /topic-metrics`：`kind=route_derived` 订阅者计数，**不是**按主题速率；`$SYS` 仅在插件加载时列出 |
| 集群拓扑 | `GET /cluster` 只读（standalone / raft / broadcast）。Join 始终禁用；Leave 仅 raft + operator+ |
| 用户 | `GET/POST /users`，`POST /users/{username}/disable|enable`（仅 admin） |
| API 密钥 | `GET/POST /api-keys`，`DELETE /api-keys/{id}`；secret 仅创建时显示一次 |
| 审计 | `GET /audit` 筛选 + 分页（仅 admin） |

列表页（客户端 / 订阅 / 路由 / 保留消息 / 插件）读取 `X-Row-Count` / `X-Truncated`，支持 `_limit` / `offset`。若 Broker 支持 `?format=page`，优先使用 `{items,row_count,truncated}`，否则回退为裸数组。侧栏与操作会根据 `GET /features` 隐藏或禁用未启用的能力（如保留消息、共享订阅、会话存储）。错误体解析 `{code,message,details?,request_id?}`，toast / 页面错误展示友好文案。

## 开发

需要 Node.js 20+ 与 [pnpm](https://pnpm.io)。

```bash
pnpm install
cp .env.example .env
# 可选：修改 Vite 代理目标，默认 http://127.0.0.1:6060
# VITE_API_PROXY_TARGET=http://127.0.0.1:6060
pnpm dev
```

浏览器打开提示的本地地址。应用使用 **Hash Router**（`#/overview` 等），`vite.config.ts` 中 `base: './'`（相对资源路径），便于静态部署，或嵌入 FerroMQ 的 `/dashboard/`。

开发时代理：

```
/api/v1  →  ${VITE_API_PROXY_TARGET:-http://127.0.0.1:6060}
```

Vite 代理 **不** 改写 `Host`（`changeOrigin: false`）。Broker CSRF 会把 `Origin`/`Referer` 的 host 与请求 `Host` 比较；若改成目标 `127.0.0.1:6060`，localhost 上的 cookie 写入会被拒绝。

请先启动 FerroMQ，并确保 `ferromq-http-api` 插件在 `6060`（或你配置的端口）监听。

## OpenAPI 与类型生成

仓库内置 `openapi/openapi.json`，来自 FerroMQ P6（`GET /api/v1/openapi.json`，亦入库于 `ferromq-plugins/ferromq-http-api/openapi/openapi.json`，[ferromq#7](https://github.com/sllt/ferromq/pull/7)）。`pnpm build` **不依赖** 实时 Broker。

```bash
pnpm gen:api          # 用入库 spec 生成 src/api/generated/schema.d.ts
pnpm gen:api:live     # curl localhost:6060/api/v1/openapi.json 后生成
# Swagger UI：GET /api/v1/docs
```

详见 [openapi/README.md](./openapi/README.md)。

## 登录与权限

P3a 会话登录 + P3b 管理页（对齐 [ferromq#3](https://github.com/sllt/ferromq/pull/3) / [ferromq#4](https://github.com/sllt/ferromq/pull/4)）：

- 启动时 `GET /api/v1/auth/me`：`200` 进入控制台，`401` 显示登录页。
- 主路径：`POST /api/v1/auth/login` `{ username, password }`，Broker 设置 HttpOnly Cookie `ferromq_session`。
- 浏览器**不存储密码**。会话只在 Cookie 中；页面只缓存 `{ username, role, auth }`。
- 所有 `/api/v1` 请求使用 `withCredentials: true` / `credentials: 'include'`。
- CSRF 依赖同域嵌入 + Broker Cookie `SameSite=Lax`；Dashboard 不单独下发 CSRF token。
- 高级选项可填 `http_bearer_token`，作为 operator/admin 自动化回退（`Authorization: Bearer`）。
- `POST /auth/logout` 清除 Cookie；用户菜单可改密（仅 session 登录，`POST /auth/change-password`）。
- `POST /auth/init` 可从 `dashboard_admin_*` 配置一次性引导管理员。
- 角色：`admin`（用户 / 密钥 / 审计 / Broker 配置写入 / `?reveal=1` / `allow_private=1`）；`operator`（踢出 / 发布 / 插件与 P5 集成写入 / 确认告警 / Raft leave）；`viewer` 只读，密钥脱敏。
- 侧栏「用户 / API 密钥 / 审计」仅 `admin` 可见。ACL / 认证 / Webhook / 桥接所有人可看，写入需 operator+。
- 未配置 Bearer、API key 与 `dashboard_admin_password` 时，`/auth/me` 返回匿名 viewer，只读接口保持开放；匿名 admin 只能由后端不安全兼容开关显式启用。
- 用户密码哈希和 API Key 哈希由 Broker 按节点持久化；Session 仍在进程内存中，集群浏览器访问需要粘性会话。

## 构建

```bash
pnpm build
pnpm preview
```

产物在 `dist/`。`base: './'` 让 JS/CSS 使用相对路径，Hash Router 让页面路径留在 `/dashboard/#/...`，嵌入子目录时不需要 History 回退。

## 嵌入 FerroMQ（同步 `dashboard-dist`）

`pnpm build` 的静态产物需要拷进 [sllt/ferromq](https://github.com/sllt/ferromq) 的 HTTP API 插件目录（后端 P7 companion PR 从这里提供 `/dashboard/`）：

```
ferromq-plugins/ferromq-http-api/dashboard-dist/
```

推荐流程：

```bash
# 干净构建 dist/，并打印 dashboard 仓库的 commit SHA
./scripts/pack-dashboard-dist.sh
# 可选：再打一份 tar.gz
./scripts/pack-dashboard-dist.sh --tarball

# 拷到本地 ferromq 工作树（示例）
rsync -a --delete dist/ /path/to/ferromq/ferromq-plugins/ferromq-http-api/dashboard-dist/
```

`dist/COMMIT` 会写入本次构建对应的 git SHA，方便对照 dashboard 与 broker 两边的版本。不要把 `node_modules` 或源码拷进 `dashboard-dist/`。

本仓库与 [sllt/ferromq](https://github.com/sllt/ferromq) 均为 public；Broker 同步脚本默认按已嵌入的 commit 重建，刷新移动中的开发分支时需显式指定 `FERROMQ_DASHBOARD_REF=dev`。

若控制台与 Broker 不同源，请由网关把 `/api/v1` 反代到 HTTP API；嵌入同进程时插件会同时提供 `/dashboard/` 与 `/api/v1`。

## CI

GitHub Actions（`.github/workflows/ci.yml`）在 Node 20 上执行：

```
pnpm install --frozen-lockfile
pnpm lint
pnpm verify:parsers
pnpm build
```

`pnpm build` 含 `tsc -b`，类型错误与 ESLint error 都会让 CI 失败。`verify:parsers` 通过 `tsx` 加载 TypeScript 模块，以便在 Node 20 上运行（不依赖 Node 22 的 `--experimental-strip-types`）。不依赖实时 Broker。

## 国际化与主题

- 语言：简体中文 / English（右上角切换，写入 `localStorage`）。
- 浅色 / 深色主题。

## 许可

MIT。包含 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 的 MIT 署名，见 [LICENSE](./LICENSE)。
