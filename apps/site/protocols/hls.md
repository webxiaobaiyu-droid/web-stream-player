---
title: HLS 接入
description: 使用原生 HLS 或 hls.js 播放直播和点播 m3u8。
---

# HLS 接入

HLS Adapter 会先检测浏览器原生 HLS。Safari 等支持原生 HLS 的环境直接使用 `<video>`，其余支持 MSE 的环境使用 hls.js。

## 最小示例

```ts
import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  muted: true
})

await player.load({
  url: 'https://media.example.com/live/camera/index.m3u8',
  protocol: 'hls',
  isLive: true
})

await player.play()
```

`.m3u8` 可以自动推断，但生产代码显式传入 `protocol: 'hls'` 更便于排障。

## 带 Cookie 或请求头

```ts
await player.load({
  url: 'https://media.example.com/private/index.m3u8',
  protocol: 'hls',
  credentials: 'include',
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

`credentials: 'include'` 会让 hls.js XHR 使用 `withCredentials`。自定义 Header 只作用于 hls.js 路径，浏览器原生 HLS 不保证使用 JavaScript 设置的 Header。需要同时支持 Safari 原生路径时，优先使用同站 Cookie、签名 URL 或 CDN Token。

## 低延迟配置

```ts
const player = createWebStreamPlayer({
  target: '#player',
  adapterOptions: {
    hls: {
      lowLatencyMode: true,
      backBufferLength: 20,
      maxLiveSyncPlaybackRate: 1.2
    }
  }
})
```

| 选项 | 默认值 | 作用 |
| --- | ---: | --- |
| `lowLatencyMode` | `true` | 启用 hls.js 低延迟策略 |
| `backBufferLength` | `30` | 保留的后向缓冲秒数 |
| `maxLiveSyncPlaybackRate` | `1.25` | 追赶直播边缘时的最大播放速率 |

## 服务端要求

建议返回正确 Content-Type：

```text
.m3u8  application/vnd.apple.mpegurl
.ts    video/mp2t
.m4s   video/iso.segment
```

跨域场景至少允许站点 Origin，并让 Manifest、分片、Key 和 Init Segment 使用一致的 CORS 规则。

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

使用 Cookie 时不能把 `Access-Control-Allow-Origin` 设置为 `*`。

## 事件

```ts
player.on('metadata', (metadata) => {
  console.log(metadata.duration, metadata.extra)
})

player.on('error', ({ error, fatal }) => {
  console.error(error.message, { fatal })
})
```

hls.js 的非致命错误会作为 `error` 事件抛出，并尝试网络恢复或媒体恢复。业务仍应记录错误频率，避免无限重试掩盖上游故障。

## 常见问题

- Manifest 能打开但分片 403：检查签名范围、Cookie 和 CDN 缓存键。
- 本地正常，HTTPS 线上失败：检查是否混用了 HTTP 分片。
- Safari 鉴权失败：原生 HLS 不能复用 hls.js 的 `xhrSetup` Header。
- 延迟持续增长：检查上游 GOP、分片时长、网络抖动和播放器缓冲配置。
