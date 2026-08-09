---
title: 浏览器能力边界
description: 了解 RTSP、H.265、MSE、WebCodecs、自动播放和跨域限制。
---

# 浏览器能力边界

浏览器播放能力由协议、封装、编码、操作系统和安全上下文共同决定。不能只根据 Chrome 版本判断。

## RTSP 不能直接进入网页

标准浏览器没有 RTSP TCP/UDP Socket API，也不会允许网页直接访问摄像头端口。RTSP 必须经过服务端 Gateway 或 Relay 转换成浏览器可消费的 HTTP、WebSocket、WebRTC 或其他 Web 协议。

本项目默认路径是：

```text
RTSP -> FFmpeg -c copy -> MPEG-TS over WebSocket -> mpegts.js -> MSE
```

这条路径不做视频转码，但仍需要一台能访问摄像头的服务器。

## H.265 不是普遍可用能力

H.265/HEVC 是否可用取决于：

- 操作系统是否提供 HEVC Codec。
- 浏览器构建是否暴露对应 MSE 或 WebCodecs 能力。
- GPU、驱动和硬件解码能力。
- 编码 profile、level、bit depth 和封装格式。
- 企业策略或系统组件是否禁用了相关能力。

运行时检测：

```ts
import { detectCapabilities, supportsWebCodec } from 'web-stream-player'

const capabilities = detectCapabilities()
const rawHevcSupported = await supportsWebCodec('hevc', 1920, 1080)

console.table({
  mse: capabilities.mse,
  webCodecs: capabilities.webCodecs,
  rawHevcSupported
})
```

面向不可控终端部署时，应保留 H.264 备选流。

## MSE

HLS 的 hls.js 路径以及 FLV/MPEG-TS 播放依赖 Media Source Extensions。Safari 会优先走原生 HLS。若 `detectCapabilities().mse` 为 `false`，FLV/MPEG-TS Adapter 不会被选择。

## WebCodecs

裸 Annex-B Adapter 需要 `VideoDecoder` 和 `EncodedVideoChunk`。WebCodecs 只解决解码，不负责 RTSP、FLV、TS 解复用和音视频同步。

## 安全上下文

生产页面使用 HTTPS 时，流地址也必须使用 HTTPS 或 WSS。HTTPS 页面连接 `ws://` 会被浏览器按 Mixed Content 拦截。

## CORS 和请求头

- HLS、HTTP-FLV、HTTP-TS 和 Fetch 裸码流需要服务端允许网页 Origin。
- HLS Adapter 可以通过 `source.headers` 给 XHR 设置请求头。
- Fetch 裸码流也支持 `source.headers` 和 `credentials`。
- 浏览器原生 `WebSocket` 构造器不能设置任意 Authorization Header。可使用短期查询参数、Cookie 或在反向代理层鉴权。

## 自动播放

多数浏览器会阻止带声音的自动播放。建议 `muted: true` 自动开始，随后由用户手势开启声音。

```ts
const player = createWebStreamPlayer({
  target: '#player',
  autoplay: true,
  muted: true
})
```

## 后台标签页

浏览器可能降低后台标签页计时器频率。实时监控页面应监听 `visibilitychange`，在业务层决定是否暂停、重载或继续保持连接。
