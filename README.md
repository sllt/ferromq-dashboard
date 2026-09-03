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
