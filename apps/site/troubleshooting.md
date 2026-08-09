---
title: 常见问题
description: 排查无 Adapter、黑屏、跨域、WSS、H.265、延迟和 Relay 故障。
---

# 常见问题

## `No adapter accepted this source`

检查：

1. `protocol` 是否与输入一致。
2. 没有扩展名的 WS URL 是否显式设置 `transport: 'websocket'`。
3. 浏览器是否支持 MSE 或 WebCodecs。
4. Annex-B 是否显式设置 `codec: 'avc'` 或 `codec: 'hevc'`。
5. RTSP 是否提供 `relayUrl`。

```ts
console.table(detectCapabilities())
console.log(source)
```

## HLS Manifest 能访问但不能播放

- 在 Network 面板检查分片、Key 和 Init Segment。
- 检查每个资源的 CORS，不只检查 m3u8。
- 检查 HTTPS 页面是否引用 HTTP 分片。
- 检查视频 Codec 是否为浏览器支持的组合。
- Safari 原生 HLS 不会复用 hls.js 自定义 Header。

## FLV 或 MPEG-TS 连接成功但黑屏

- 确认流内有 H.264 视频轨。
- 确认有 SPS、PPS 和周期性关键帧。
- MPEG-TS 确认 PAT/PMT 会重复发送。
- WebSocket 确认发送 binary，不是 Base64 String。
- 检查 MSE 支持和 mpegts.js Error Event。

## RTSP Relay 返回 401

配置存在 `accessToken` 时，WebSocket URL 必须带匹配的 `?token=`。经过 Nginx 时确认查询参数没有被改写或丢弃。

## RTSP Relay 返回 404

路径必须是：

```text
/stream/<stream-id>
```

并且 `<stream-id>` 必须存在于配置 `streams` 中。Stream ID 只允许字母、数字、下划线和连字符。

## Relay 有连接但 FFmpeg 不运行

```bash
curl http://127.0.0.1:8787/health
```

检查目标 Stream 的 `clients`、`running` 和 `lastError`。同时确认：

- `ffmpegPath` 正确。
- Relay 主机能访问摄像头 IP 和端口。
- RTSP 账号密码有效。
- 摄像头没有达到最大 Session 数。
- TCP/UDP Transport 与网络策略一致。

## 固定 60 秒左右断开

通常是 Nginx、CDN 或负载均衡器的默认 Idle Timeout。增加 WebSocket Read Timeout，并确认链路中每一层都允许长连接。

## HTTPS 页面无法连接 `ws://`

这是 Mixed Content。部署 TLS，并把浏览器地址改成 `wss://`。参考[Nginx 与 WSS](/deployment/nginx)。

## H.265 检测通过仍然失败

`VideoDecoder.isConfigSupported()` 只验证一个 Codec Config。真实流还可能因为 profile、level、bit depth、NAL 格式或驱动问题失败。

```ts
const supported = await supportsWebCodec('hevc', width, height)
```

保留 H.264 备选流，并记录目标设备、系统、浏览器构建和码流参数。

## 自动播放失败

```ts
const player = createWebStreamPlayer({
  target: '#player',
  autoplay: true,
  muted: true
})
```

带声音自动播放通常被浏览器阻止。让用户点击后再调用 `setMuted(false)`。

## 延迟持续增长

- 检查上游 GOP 和关键帧周期。
- 检查代理缓冲。
- FLV/TS 开启 `liveBufferLatencyChasing`。
- 记录 `bufferedSeconds`、bitrate、fps 和 droppedFrames。
- 确认设备时间和端到端延迟测量方式，而不是只看 Player Buffer。

## 浏览器内存持续增长

- 页面卸载时调用 `destroy()`。
- 切换流时复用同一个 Player 或销毁旧实例。
- 不要累积 `stats` 和 `frame` 事件历史。
- 检查业务截图、Canvas、Object URL 和 Web Worker 是否释放。
- 检查慢 WebSocket 客户端和 Relay `bufferedAmount`。

## 提交 Issue 前

提供：

- 操作系统、浏览器和版本。
- 协议、容器、视频与音频 Codec。
- 能脱敏复现的最小代码或公开 Sample。
- Player Event 和 Relay Log。
- `detectCapabilities()` 输出。
- 是否经过 CDN、Nginx、VPN 或企业代理。

删除账号密码、Token、签名 URL、内网 IP 和业务数据后，再提交到 [GitHub Issues](https://github.com/webxiaobaiyu-droid/web-stream-player/issues)。
