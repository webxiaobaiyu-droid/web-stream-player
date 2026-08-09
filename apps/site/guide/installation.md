---
title: 安装与发布状态
description: 从源码运行 Web Stream Player，并了解 npm 首次发布前后的安装方式。
---

# 安装与发布状态

## 当前状态

GitHub 源码、在线文档和 Playground 已公开。`web-stream-player` 及 `@web-stream-player/*` 的 npm 包清单已经准备完成，但目前尚未发布到 npm Registry。

::: warning 不要混淆两个状态
GitHub Pages 上线不等于 npm 包已经发布。npm 首次 Release 完成前，`pnpm add web-stream-player` 会返回 404。
:::

## 从源码运行

需要 Node.js 18+ 和 pnpm 9。生成媒体样例或运行 RTSP Relay 时还需要 FFmpeg。

```bash
git clone https://github.com/webxiaobaiyu-droid/web-stream-player.git
cd web-stream-player
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

启动文档站：

```bash
pnpm dev:site
```

启动协议工作台：

```bash
pnpm dev
```

## npm 发布后的安装方式

完整默认栈：

```bash
pnpm add web-stream-player
```

只安装特定 Adapter：

```bash
pnpm add @web-stream-player/core @web-stream-player/hls
```

框架组件：

```bash
pnpm add web-stream-player @web-stream-player/vue vue
pnpm add web-stream-player @web-stream-player/react react
pnpm add web-stream-player @web-stream-player/element
```

RTSP Relay：

```bash
pnpm add @web-stream-player/rtsp-relay
```

## 包的职责

| 包 | 职责 |
| --- | --- |
| `web-stream-player` | 默认 Adapter 组合和统一入口 |
| `@web-stream-player/core` | Player、状态机、事件、Surface、Adapter Registry |
| `@web-stream-player/hls` | 原生 HLS 与 hls.js Adapter |
| `@web-stream-player/mpegts` | FLV、MPEG-TS、RTSP Relay 播放 Adapter |
| `@web-stream-player/webcodecs` | Annex-B、WebCodecs、WASM 接口和 Canvas Renderer |
| `@web-stream-player/rtsp-relay` | Node.js RTSP stream-copy Relay |
| `@web-stream-player/vue` | Vue 3 组件 |
| `@web-stream-player/react` | React 组件 |
| `@web-stream-player/element` | Web Component |

## 生产发布前检查

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

需要发布 npm 时，还应确认包名权限、版本号、Changeset、双因素认证和 npm provenance。不要把 npm Token 写进仓库或普通 Relay 配置。
