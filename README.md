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

浏览器打开提示的本地地址。应用使用 **Hash Router**（`#/overview` 等），`vite.config.ts` 中 `base: './'`，便于静态部署或嵌入。

开发时代理：

```
/api/v1  →  ${VITE_API_PROXY_TARGET:-http://127.0.0.1:6060}
```

请先启动 FerroMQ，并确保 `ferromq-http-api` 插件在 `6060`（或你配置的端口）监听。

## OpenAPI 与类型生成

仓库内置 `openapi/openapi.json`，来自 FerroMQ P5（`GET /api/v1/openapi.json`，亦入库于 `ferromq-plugins/ferromq-http-api/openapi/openapi.json`，[ferromq#6](https://github.com/sllt/ferromq/pull/6)）。`pnpm build` **不依赖** 实时 Broker。

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
- 高级选项可填 `http_bearer_token`，作为 operator/admin 自动化回退（`Authorization: Bearer`）。
- `POST /auth/logout` 清除 Cookie；用户菜单可改密（仅 session 登录，`POST /auth/change-password`）。
- `POST /auth/init` 可从 `dashboard_admin_*` 配置一次性引导管理员。
- 角色：`admin`（用户 / 密钥 / 审计 / Broker 配置写入 / `?reveal=1` / `allow_private=1`）；`operator`（踢出 / 发布 / 插件与 P5 集成写入）；`viewer` 只读，密钥脱敏。
- 侧栏「用户 / API 密钥 / 审计」仅 `admin` 可见。ACL / 认证 / Webhook / 桥接所有人可看，写入需 operator+。
- 未配置 Bearer、API key 与 `dashboard_admin_password` 时，`/auth/me` 仍可能返回匿名 admin（开放访问）。

## 构建

```bash
pnpm build
pnpm preview
```

产物在 `dist/`，可直接放到任意静态站点。若与 FerroMQ 不同源，请由网关把 `/api/v1` 反代到 HTTP API。

## 国际化与主题

- 语言：简体中文 / English（右上角切换，写入 `localStorage`）。
- 浅色 / 深色主题。

## 许可

MIT。包含 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 的 MIT 署名，见 [LICENSE](./LICENSE)。
