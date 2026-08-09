---
title: RTSP 接入
description: 使用内置 Relay 将 RTSP 无转码转封装为浏览器可播放的 MPEG-TS over WebSocket。
---

# RTSP 接入

浏览器不能直接连接标准 RTSP。本项目提供 Node.js Relay，在能访问摄像头的服务器上启动 FFmpeg，以 `-c copy` 把视频转封装成 MPEG-TS，再通过 WebSocket 广播给浏览器。

## 架构

```text
RTSP Camera
    |
    | one RTSP input per active stream
    v
FFmpeg -c copy
    |
    | MPEG-TS bytes
    v
StreamHub
    +------ WebSocket viewer A
    +------ WebSocket viewer B
    +------ WebSocket viewer N
```

第二个观看端不会创建第二个 RTSP 输入或 FFmpeg 进程，但服务器出口带宽会继续增长。

## 安装 Relay

```bash
pnpm add @web-stream-player/rtsp-relay
```

服务器还需要可执行的 FFmpeg：

```bash
ffmpeg -version
```

## 创建配置

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

配置文件放在网站公开目录之外，并通过文件权限限制读取。不要提交真实账号、密码、内网 IP 和 Token。

## 启动

```bash
web-stream-relay ./relay.config.json
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/streams
```

`/health` 会返回每个 Hub 的观看人数、运行状态、发送字节、丢块和最后一次错误。

## 浏览器接入

```ts
await player.load({
  url: 'rtsp://configured-on-relay/workshop-01',
  protocol: 'rtsp',
  codec: 'avc',
  relayUrl: 'wss://relay.example.com/stream/workshop-01?token=replace-with-a-random-secret',
  isLive: true
})

await player.play()
```

这里的 `url` 是描述信息。Relay 不读取浏览器传入的 RTSP 地址，只会打开服务端配置内 `workshop-01` 对应的白名单 URL。

## 生命周期

1. 第一个观看端连接 `/stream/workshop-01`。
2. Relay 启动该 Stream Hub 的 FFmpeg 子进程。
3. FFmpeg stdout 中的 TS Chunk 广播给全部观看端。
4. 慢客户端缓冲超过 `maxClientBufferBytes` 时，该客户端对应 Chunk 被丢弃。
5. 最后一个观看端离开后，Relay 等待 `idleTimeoutMs`。
6. 空闲期结束后停止 FFmpeg。

## TCP 还是 UDP

默认 `rtspTransport: 'tcp'`。TCP 在复杂网络和跨网段场景更稳定。局域网低延迟且允许丢包时可以测试 UDP，但必须通过真实摄像头验证。

## 音频

`includeAudio: false` 会向 FFmpeg 传入 `-an`。开启音频后使用 `-map 0:a?` 和 `-c copy`，最终能否播放取决于 TS 内音频 Codec 是否被目标浏览器支持。

## 生产上线

继续阅读：

- [Nginx 与 WSS](/deployment/nginx)
- [鉴权与安全边界](/deployment/security)
- [容量与多观看端](/deployment/capacity)
- [性能实测](/benchmarks)
