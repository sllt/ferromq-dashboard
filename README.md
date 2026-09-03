# FerroMQ Dashboard

FerroMQ HTTP API (`/api/v1`) 的运维控制台。基于 React 19、Vite、TypeScript、shadcn/ui、Tailwind CSS、TanStack Router / Query / Table、Zustand 与 Recharts。

界面结构参考 [shadcn-admin](https://github.com/satnaing/shadcn-admin)（MIT）。**不包含** Clerk / faker 演示应用，所有页面只请求真实 `/api/v1`。

## 功能

| 页面 | API |
| --- | --- |
| 登录 | `GET /api/v1` 校验 Bearer Token |
| 总览 | `/stats` `/stats/sum` `/metrics` `/metrics/sum`，以及可用时的 `/stats/history/sum` `/metrics/history/sum`；`/nodes` `/brokers` |
| 节点 | `/nodes` `/brokers` `/health/check` `/features` |
| 客户端 | `/clients`、详情、`DELETE /clients/{id}`、离线列表与批量踢出 |
| 订阅 | `/subscriptions` |
| 路由 | `/routes` |
| 保留消息 | `/retains`、`DELETE /retains?topic=` |
| 发布 | `POST /mqtt/publish` |
| 插件 | 集群 JSON `[{node, plugins:[...]}]`；`load` / `unload` / `config/reload` / `config` |

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

仓库内置 `openapi/openapi.json`（与当前 `/api/v1` 控制台表面一致的 stub）。`pnpm build` **不依赖** 实时 Broker。

```bash
# 用 stub 生成 src/api/generated/schema.d.ts
pnpm gen:api

# Broker 已提供 GET /api/v1/openapi.json 时，刷新 stub 再生成
# 等价于：curl localhost:6060/api/v1/openapi.json -o openapi/openapi.json
pnpm gen:api:live
```

详见 [openapi/README.md](./openapi/README.md)。

## 登录

填写 `plugins/ferromq-http-api.toml` 中的 `http_bearer_token`。

- Token 保存在内存 + `sessionStorage`（键名 `ferromq_http_bearer_token`）。
- 请求拦截器自动加 `Authorization: Bearer <token>`。
- `401` 会清空会话并回到登录页。
- Broker 未开启鉴权时可留空后连接。

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
