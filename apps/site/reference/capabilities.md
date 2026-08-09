---
title: 能力检测
description: 检测 MSE、WebCodecs、原生 HLS、WebSocket、WebTransport、WebGL2 和 WASM。
---

# 能力检测

## detectCapabilities()

```ts
import { detectCapabilities } from 'web-stream-player'

const capabilities = detectCapabilities()
console.table(capabilities)
```

返回：

```ts
interface PlaybackCapabilities {
  mse: boolean
  webCodecs: boolean
  nativeHls: boolean
  webSocket: boolean
  webTransport: boolean
  webGl2: boolean
  wasm: boolean
}
```

## 字段含义

| 字段 | 检测方式 | 不代表什么 |
| --- | --- | --- |
| `mse` | `MediaSource` 存在 | 不保证目标 Codec/Container 可用 |
| `webCodecs` | `VideoDecoder` 和 `EncodedVideoChunk` 存在 | 不保证 H.264/H.265 配置可解码 |
| `nativeHls` | video `canPlayType()` | 不保证鉴权、Codec 和所有 HLS Feature 可用 |
| `webSocket` | `WebSocket` 存在 | 不保证网络和 WSS 证书有效 |
| `webTransport` | `WebTransport` 存在 | 当前没有默认 Adapter |
| `webGl2` | 能创建 WebGL2 Context | 当前 Canvas Renderer 不自动切换 WebGL2 |
| `wasm` | `WebAssembly` 存在 | 不代表已提供 WASM Decoder |

## supportsWebCodec()

对具体 WebCodecs 配置做异步检测：

```ts
import { supportsWebCodec } from 'web-stream-player'

const avc1080p = await supportsWebCodec('avc', 1920, 1080)
const hevc4k = await supportsWebCodec('hevc', 3840, 2160)
```

内部使用 `VideoDecoder.isConfigSupported()`，Codec String 为：

- AVC: `avc1.640028`
- HEVC: `hvc1.1.6.L93.B0`

返回 `true` 只表示浏览器接受该配置，不保证所有真实码流都能稳定播放。仍需验证 profile、level、bit depth、参考帧和设备驱动。

## 能力驱动的降级

```ts
const capabilities = detectCapabilities()
const hevc = await supportsWebCodec('hevc', 1920, 1080)

const source = capabilities.webCodecs && hevc
  ? {
      url: 'wss://media.example.com/live/camera.h265',
      protocol: 'annexb' as const,
      transport: 'websocket' as const,
      codec: 'hevc' as const
    }
  : {
      url: 'https://media.example.com/live/camera/index.m3u8',
      protocol: 'hls' as const,
      codec: 'avc' as const
    }

await player.load(source)
```
