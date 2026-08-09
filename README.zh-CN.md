# Web Stream Player

用一套浏览器 API 播放 HLS、HTTP/WS-FLV、HTTP/WS MPEG-TS、裸 H.264/H.265，以及通过无转码中继接入的 RTSP。

[English](./README.md) | [贡献指南](./CONTRIBUTING.md) | [安全说明](./SECURITY.md)

[在线协议工作台](https://webxiaobaiyu-droid.github.io/web-stream-player/) | [Relay 实测报告](./BENCHMARKS.md)

Web Stream Player 是一个基于 Adapter 的 TypeScript 播放器 SDK。可以直接安装包含常用协议的完整播放器，也可以只组合业务需要的协议包。仓库内置 Vue 调试工作台，可查看 Adapter 选择、浏览器能力、码率、帧率、缓冲、掉帧、截图和播放器事件。

![Web Stream Player 正在播放 HLS 样例](./docs/workbench-desktop.jpg)

> 浏览器不能直接连接标准 RTSP。项目附带的 Relay 使用 FFmpeg `-c copy`，把 RTSP 无损转封装成 WebSocket MPEG-TS；它不会解码，也不会转码视频。

## 支持范围

| 输入 | 传输 | 播放链路 | 状态 |
| --- | --- | --- | --- |
| HLS（H.264/AAC） | HTTP(S) | 原生 HLS 或 hls.js + MSE | 稳定 |
| FLV（H.264/AAC） | HTTP(S)、WebSocket | mpegts.js + MSE | 稳定 |
| MPEG-TS（H.264/AAC） | HTTP(S)、WebSocket | mpegts.js + MSE | 稳定 |
| RTSP（H.264） | RTSP 到 Relay，WS(S) 输出 TS | FFmpeg 复制码流 + mpegts.js | 稳定 |
| HLS/FLV/TS/RTSP（H.265） | HTTP(S)、WS(S) | 系统和浏览器支持 HEVC MSE 时可用 | 取决于运行环境 |
| 裸 H.264 Annex-B | Fetch 流、WebSocket | WebCodecs + Canvas | 实验性 |
| 裸 H.265 Annex-B | Fetch 流、WebSocket | WebCodecs + Canvas | 实验性且依赖运行环境 |
| WASM 解码 H.264/H.265 | Fetch 流、WebSocket | 注入 `WasmDecoderFactory` | 已提供接口，不内置解码器 |
| MP4/WebM 等原生媒体 | HTTP(S)、blob、data URL | 原生 `<video>` | 稳定 |
| WebTransport | WebTransport | 已预留 Adapter 契约 | 计划中 |

H.265 能否播放不能只看 Chrome 版本，还取决于操作系统编解码组件、硬件、浏览器构建、编码 profile/level 和封装格式。请在运行时调用 `detectCapabilities()` 和 `supportsWebCodec('hevc')`，面向广泛终端部署时保留 H.264 备选流。

## 快速开始

```bash
pnpm add web-stream-player
```

```ts
import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  muted: true,
  autoplay: false
})

player.on('error', ({ error }) => console.error(error))
player.on('stats', (stats) => console.table(stats))

await player.load({
  url: 'https://media.example.com/live/index.m3u8',
  protocol: 'hls'
})
await player.play()
```

播放容器应设置稳定尺寸：

```css
#player {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  background: #0e1312;
}
```

浏览器通常会阻止带声音自动播放。建议先静音播放，或者在用户点击后调用 `play()`。

## 常见输入

```ts
// HTTP-FLV
await player.load({ url: '/live/camera.flv', protocol: 'flv' })

// WebSocket MPEG-TS
await player.load({
  url: 'wss://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'websocket'
})

// Fetch 流式读取裸 H.264 Annex-B
await player.load({
  url: '/live/camera.h264',
  protocol: 'annexb',
  codec: 'avc',
  fps: 25
})
```

未指定 `protocol` 或 `codec` 时，会根据扩展名以及 `?format=flv&codec=h264` 这类参数推断。没有扩展名的直播地址建议显式传值。

## 接入 RTSP

在能够访问摄像头的服务器安装 FFmpeg 和 Relay：

```bash
pnpm add @web-stream-player/rtsp-relay
```

创建服务端配置，不要放进网站公开目录，也不要提交真实密码：

```json
{
  "host": "0.0.0.0",
  "port": 8787,
  "ffmpegPath": "ffmpeg",
  "accessToken": "replace-with-a-random-secret",
  "idleTimeoutMs": 5000,
  "maxClientBufferBytes": 4194304,
  "streams": {
    "workshop-01": {
      "label": "一号厂房摄像头",
      "url": "rtsp://viewer:password@192.168.1.20:554/live",
      "rtspTransport": "tcp",
      "includeAudio": false
    }
  }
}
```

启动：

```bash
web-stream-relay ./relay.config.json
```

浏览器只连接 Relay：

```ts
await player.load({
  url: 'rtsp://configured-on-relay/workshop-01',
  protocol: 'rtsp',
  relayUrl: 'wss://relay.example.com/stream/workshop-01?token=replace-with-a-random-secret'
})
```

浏览器传入的 RTSP URL 只是描述信息，Relay 只会打开配置白名单内的服务端地址。第一个浏览器连接时启动 FFmpeg，后续浏览器共享同一个 FFmpeg 输出；最后一个浏览器离开后，进程会在 `idleTimeoutMs` 后回收。

```mermaid
flowchart LR
  Camera["RTSP 摄像头"] -->|"一路拉流"| FFmpeg["FFmpeg -c copy"]
  FFmpeg -->|"MPEG-TS 字节流"| Hub["Relay Stream Hub"]
  Hub -->|"WebSocket"| BrowserA["浏览器 A"]
  Hub -->|"WebSocket"| BrowserB["浏览器 B"]
  BrowserA --> MSE1["mpegts.js + MSE"]
  BrowserB --> MSE2["mpegts.js + MSE"]
```

由于不转码，服务器的 CPU/GPU 开销较低；但出口带宽仍随观看人数线性增加。例如 4 Mb/s 的摄像头被两个浏览器观看，Relay 出口大约是 8 Mb/s。

在 Apple M4 的记录测试中，1 个和 2 个观看端始终共享同一个 FFmpeg 进程，Relay 丢块均为 0。双观看端每路约 4.32 Mb/s，Relay CPU 约 1.1%。环境、方法、进程资源和限制见 [BENCHMARKS.md](./BENCHMARKS.md)。

## Vue 3

```bash
pnpm add web-stream-player @web-stream-player/vue vue
```

```vue
<script setup lang="ts">
import { WebStreamPlayer } from '@web-stream-player/vue'

const source = {
  url: '/live/camera.flv',
  protocol: 'flv' as const
}
</script>

<template>
  <WebStreamPlayer :source="source" :muted="true" @stats="console.table" />
</template>
```

## React

```bash
pnpm add web-stream-player @web-stream-player/react react
```

```tsx
import { WebStreamPlayer } from '@web-stream-player/react'

export function Camera() {
  return (
    <WebStreamPlayer
      source={{ url: '/live/camera.ts', protocol: 'mpegts' }}
      muted
    />
  )
}
```

## Web Component

```ts
import { defineWebStreamPlayer } from '@web-stream-player/element'

defineWebStreamPlayer()
```

```html
<web-stream-player src="/live/camera.flv" protocol="flv" muted></web-stream-player>
```

## 按需安装 Adapter

只播放 HLS 时，可以绕过完整包，直接组合 Core 和 HLS Adapter：

```bash
pnpm add @web-stream-player/core @web-stream-player/hls
```

```ts
import { StreamPlayer, createNativeVideoAdapter } from '@web-stream-player/core'
import { createHlsAdapter } from '@web-stream-player/hls'

const player = new StreamPlayer({
  target: '#player',
  adapters: [createHlsAdapter(), createNativeVideoAdapter()]
})
```

## 开发 Adapter

Adapter 通过 `probe()` 返回确定性的适配分数，并在 `attach()` 中返回可销毁的播放会话：

```ts
import type { StreamAdapter } from '@web-stream-player/core'

const adapter: StreamAdapter = {
  id: 'my-protocol',
  name: 'My protocol',
  probe: ({ source, capabilities }) =>
    source.protocol === 'native' && capabilities.mse ? 80 : 0,
  attach: async ({ source, surface, signal }) => {
    const video = surface.video({ muted: true })
    video.src = source.url
    signal.addEventListener('abort', () => video.pause(), { once: true })
    return {
      play: () => video.play(),
      pause: () => video.pause(),
      destroy: () => surface.clear()
    }
  }
}
```

`0` 表示不支持，分数更高的 Adapter 优先；同分时保持注册顺序。

## 项目结构

```text
packages/core         播放器状态机、事件、能力检测、Adapter Registry
packages/player       默认 Adapter 组合和统一入口
packages/hls          hls.js / 原生 HLS Adapter
packages/mpegts       FLV、MPEG-TS、RTSP Relay Adapter
packages/webcodecs    Annex-B、WebCodecs、WASM 接口、Canvas 渲染
packages/rtsp-relay   Node.js RTSP 无转码中继
packages/vue          Vue 3 组件
packages/react        React 组件
packages/element      Web Component
apps/playground       Vue 协议调试工作台
```

## 本地开发

需要 Node.js 18+、pnpm 9；生成本地媒体样例还需要 FFmpeg。

```bash
pnpm install
pnpm samples
pnpm dev
```

打开 `http://localhost:5173`。仓库内置了压缩后的小型样例，因此线上工作台也可以直接播放。

部署工作台时设置 `VITE_REPOSITORY_URL`，即可让顶部入口指向发布后的 GitHub 仓库。

质量检查：

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 安全边界

- Relay 不能接受客户端任意传入的 RTSP URL，否则会变成 SSRF 和内网扫描入口。
- 摄像头账号密码放在未提交的配置或密钥系统中。
- 生产环境通过反向代理终止 TLS，对浏览器只暴露 WSS。
- 内置 Token 只是最低限度的共享密钥校验，不是用户身份系统；公网部署还需要业务鉴权。
- 在反向代理层增加 Origin 检查、限流和网络 ACL。

## Roadmap

- Worker 化的参考 WASM 解码器接入
- WebTransport 字节流 Adapter
- 裸码流音频链路
- 延迟统计和可配置重连策略
- 自动化跨浏览器兼容样例
- 面向 RGBA/YUV 帧的可选 WebGL Renderer

## License

MIT
