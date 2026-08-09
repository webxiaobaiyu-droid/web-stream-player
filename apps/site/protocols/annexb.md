---
title: 裸 H.264 / H.265 接入
description: 使用 WebCodecs 或业务注入的 WASM Decoder 播放 Annex-B 字节流。
---

# 裸 H.264 / H.265 接入

Annex-B Adapter 面向带 Start Code 的裸视频 NAL Unit 字节流。它不负责 MP4、FLV、TS 或 RTSP 解复用，也不包含音频链路。

::: warning 实验性能力
生产使用前必须用目标浏览器、操作系统、GPU、编码 profile 和真实码流验证。H.265 尤其不能只看浏览器版本。
:::

## H.264 over WebSocket

```ts
await player.load({
  url: 'wss://media.example.com/live/camera.h264',
  protocol: 'annexb',
  transport: 'websocket',
  codec: 'avc',
  fps: 25,
  width: 1920,
  height: 1080,
  isLive: true
})
```

WebSocket Message 使用二进制数据。Chunk 可以跨 NAL 边界，内置 Demuxer 会保留尾部数据并继续解析。

## H.264 over Fetch Stream

```ts
await player.load({
  url: 'https://media.example.com/live/camera.h264',
  protocol: 'annexb',
  transport: 'http',
  codec: 'avc',
  fps: 25,
  headers: {
    Authorization: `Bearer ${token}`
  },
  credentials: 'include'
})
```

HTTP 响应必须提供可读取的 `ReadableStream`，中间代理不能完整缓冲后再返回。

## H.265

```ts
import { supportsWebCodec } from 'web-stream-player'

const supported = await supportsWebCodec('hevc', 1920, 1080)

if (supported) {
  await player.load({
    url: 'wss://media.example.com/live/camera.h265',
    protocol: 'annexb',
    transport: 'websocket',
    codec: 'hevc',
    fps: 25
  })
} else {
  // 切换 H.264 备选流，或使用业务注入的 WASM Decoder。
}
```

## WebCodecs 路径

内置配置会请求：

```ts
{
  codec: 'avc1.640028', // HEVC 使用 hvc1.1.6.L93.B0
  optimizeForLatency: true,
  hardwareAcceleration: 'prefer-hardware'
}
```

队列超过 `maxDecodeQueueSize` 时会丢弃非关键帧，并等待下一个关键帧恢复。

```ts
const player = createWebStreamPlayer({
  target: '#player',
  adapterOptions: {
    annexb: {
      maxDecodeQueueSize: 8
    }
  }
})
```

## 注入 WASM Decoder

项目只提供接口，不内置 FFmpeg WASM 或其他解码器。

```ts
import type { WasmDecoderFactory } from 'web-stream-player'

const wasmDecoderFactory: WasmDecoderFactory = async () => ({
  configure(config) {
    // 初始化 Worker、WASM 内存和 Codec。
  },
  async decode(unit) {
    // 返回 RGBA Frame 数组。
    return [{
      data: rgbaBytes,
      width: 1920,
      height: 1080,
      timestamp: unit.timestamp
    }]
  },
  close() {
    // 释放 Worker 和 WASM 资源。
  }
})

const player = createWebStreamPlayer({
  target: '#player',
  adapterOptions: {
    annexb: { wasmDecoderFactory }
  }
})
```

实际项目应把 WASM 解码放进 Worker。主线程同时执行解码、RGBA 拷贝和 Canvas 绘制时，很容易造成输入延迟。

## 当前限制

- 没有音频解析、音画同步和时钟恢复。
- Codec 必须显式设置为 `avc` 或 `hevc`。
- H.265 依赖目标环境或业务 WASM Decoder。
- RGBA WASM 输出内存带宽成本较高。
- 生产场景需要补充网络抖动、断线重连和长期运行测试。
