---
title: HTTP / WS MPEG-TS 接入
description: 通过 HTTP 或 WebSocket 播放 MPEG-TS 直播字节流。
---

# HTTP / WS MPEG-TS 接入

MPEG-TS Adapter 与 FLV 共用 mpegts.js 播放链路。输入可以是普通 HTTP 响应，也可以是持续发送二进制数据的 WebSocket。

## HTTP MPEG-TS

```ts
await player.load({
  url: 'https://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'http',
  isLive: true
})
```

## WebSocket MPEG-TS

```ts
await player.load({
  url: 'wss://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'websocket',
  isLive: true
})
```

RTSP Relay 的浏览器输出也是 MPEG-TS over WebSocket，但源对象应使用 `protocol: 'rtsp'` 和 `relayUrl`，便于日志、Adapter 选择和业务语义保持清晰。

## 服务端数据要求

- WebSocket Frame 使用 binary 类型。
- 流内需要周期性发送 PAT/PMT。
- 观看端中途加入时应尽快收到 SPS、PPS 和 IDR。
- 时间戳必须单调且可恢复。
- 当前稳定组合是 H.264/AAC。

本项目 RTSP Relay 使用：

```bash
-c copy \
-f mpegts \
-mpegts_flags +resend_headers \
-muxdelay 0 \
-muxpreload 0
```

## 监听码率与掉帧

```ts
player.on('stats', ({ bitrate, bufferedSeconds, fps, droppedFrames }) => {
  console.table({ bitrate, bufferedSeconds, fps, droppedFrames })
})
```

`bitrate` 来自 mpegts.js 的下载速度统计。它适合诊断，不应作为精确计费依据。

## 什么时候选择 MPEG-TS

- 已有流媒体服务器可以输出 TS over WebSocket。
- 需要给 RTSP 摄像头提供轻量级 browser gateway。
- 上游容易生成 TS，但不希望增加 HLS 分片延迟。

若端到端低延迟和弱网恢复优先级更高，应同时评估 WebRTC。当前项目未内置 WebRTC Adapter。
