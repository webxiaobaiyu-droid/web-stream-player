---
title: HTTP / WS-FLV 接入
description: 通过 HTTP 或 WebSocket 使用 mpegts.js 播放 FLV 直播流。
---

# HTTP / WS-FLV 接入

FLV Adapter 使用 mpegts.js 解复用，并通过 MSE 喂给 `<video>`。当前稳定路径面向 H.264/AAC。

## HTTP-FLV

```ts
await player.load({
  url: 'https://media.example.com/live/camera.flv',
  protocol: 'flv',
  transport: 'http',
  isLive: true
})

await player.play()
```

服务端响应必须持续输出数据，代理层不能把整段响应缓冲完成后再返回。

## WebSocket-FLV

```ts
await player.load({
  url: 'wss://media.example.com/live/camera.flv',
  protocol: 'flv',
  transport: 'websocket',
  isLive: true
})
```

WebSocket 必须发送二进制 FLV 字节，不要发送 Base64 文本。

## 延迟配置

```ts
const player = createWebStreamPlayer({
  target: '#player',
  adapterOptions: {
    mpegts: {
      enableWorker: false,
      lazyLoad: false,
      liveBufferLatencyChasing: true,
      liveBufferLatencyMaxLatency: 1.5,
      liveBufferLatencyMinRemain: 0.3
    }
  }
})
```

| 选项 | 默认值 | 说明 |
| --- | ---: | --- |
| `enableWorker` | `false` | 是否启用 mpegts.js Worker 路径 |
| `lazyLoad` | `false` | 直播默认持续加载 |
| `liveBufferLatencyChasing` | `true` | 追赶过大的直播缓冲 |
| `liveBufferLatencyMaxLatency` | `1.5` | 开始追赶的缓冲阈值，单位秒 |
| `liveBufferLatencyMinRemain` | `0.3` | 追赶后保留的缓冲，单位秒 |

## 鉴权

HTTP-FLV 可使用 Cookie：

```ts
await player.load({
  url: 'https://media.example.com/private/camera.flv',
  protocol: 'flv',
  credentials: 'include'
})
```

当前 mpegts.js Adapter 不会把 `StreamSource.headers` 传给 FLV Loader。需要 Bearer Token 时，使用签名 URL、Cookie，或在业务中自定义 Adapter。

浏览器 WebSocket 不能设置任意 Authorization Header。WSS 鉴权通常放在短期查询参数、Cookie或反向代理握手阶段。

## 代理设置

- 关闭响应缓冲和缓存。
- 增大长连接读取超时。
- HTTPS 页面必须连接 HTTPS 或 WSS。
- HTTP-FLV 跨域时配置 CORS。
- WSS 代理必须转发 `Upgrade` 和 `Connection` Header。

## 常见问题

- 有连接无画面：确认流内存在 H.264 视频轨和关键帧。
- 缓冲越来越大：检查 `lazyLoad` 和 latency chasing 设置。
- 几分钟后断开：检查 Nginx、CDN 和负载均衡器的空闲超时。
- Safari 不工作：确认该 Safari 版本的 MSE 能力与容器 Codec 支持。
