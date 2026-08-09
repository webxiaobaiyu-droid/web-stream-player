---
title: StreamSource
description: StreamSource 的协议、传输、Codec、鉴权和元数据字段参考。
---

# StreamSource

```ts
interface StreamSource {
  url: string
  protocol?: StreamProtocol
  transport?: StreamTransport
  codec?: VideoCodec
  mimeType?: string
  relayUrl?: string
  streamId?: string
  headers?: Record<string, string>
  credentials?: RequestCredentials
  isLive?: boolean
  fps?: number
  width?: number
  height?: number
  metadata?: Record<string, unknown>
}
```

## 字段

| 字段 | 说明 |
| --- | --- |
| `url` | 原始输入 URL。RTSP 时作为描述信息和协议判断来源 |
| `protocol` | `auto`、`native`、`hls`、`flv`、`mpegts`、`rtsp`、`annexb` |
| `transport` | `auto`、`http`、`websocket`、`webtransport` |
| `codec` | `auto`、`avc`、`hevc` |
| `mimeType` | 原生媒体等场景的 MIME 描述 |
| `relayUrl` | RTSP 对应的 WS(S) MPEG-TS Relay URL |
| `streamId` | 业务可用的流标识，当前默认 Adapter 不依赖 |
| `headers` | HLS XHR 和 Fetch Annex-B 的请求头 |
| `credentials` | Fetch/XHR Cookie 策略 |
| `isLive` | 是否直播，默认 Native 为 `false`，其他协议为 `true` |
| `fps` | 裸码流时间戳生成使用的帧率，默认 25 |
| `width` / `height` | 裸码流 Decoder 和 Canvas 的可选尺寸 |
| `metadata` | 传递给自定义 Adapter 的业务元数据 |

## 自动推断

| URL 特征 | 推断协议 |
| --- | --- |
| `rtsp://` | `rtsp` |
| `.m3u8` | `hls` |
| `.flv` | `flv` |
| `.ts`、`.m2ts` | `mpegts` |
| `.h264`、`.264` | `annexb` + `avc` |
| `.h265`、`.hevc`、`.265` | `annexb` + `hevc` |
| `blob:`、`data:` | `native` |

查询参数也可以提示：

```text
/live?id=1&format=mpegts&codec=h264
```

没有明确特征的 HTTP URL 会回落到 `native`，没有明确特征的 WS URL 保持 `auto`，可能导致没有 Adapter。实时接口建议显式传字段。

## 传输推断

- `ws://` 和 `wss://` 推断为 `websocket`。
- `http://`、`https://`、绝对路径和相对路径推断为 `http`。
- 其他 Scheme 推断为 `auto`。

## 示例

```ts
const source: StreamSource = {
  url: 'wss://media.example.com/live/camera',
  protocol: 'annexb',
  transport: 'websocket',
  codec: 'avc',
  fps: 25,
  width: 1280,
  height: 720,
  isLive: true,
  metadata: {
    cameraId: 'gate-east'
  }
}
```
