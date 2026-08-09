---
title: RTSP Relay 部署
description: 配置和运行 Node.js RTSP Relay，管理 Stream Hub、FFmpeg 和健康检查。
---

# RTSP Relay 部署

Relay 运行在能访问摄像头的服务器。它不会把客户端传入的 URL 交给 FFmpeg，而是只接受配置文件中的 Stream ID。

## 前置条件

- Node.js 18+
- FFmpeg 6+，生产环境建议使用当前受支持版本
- 能从服务器访问摄像头 RTSP 地址
- 浏览器侧使用 HTTPS 时准备 TLS 反向代理

```bash
node --version
ffmpeg -version
```

## 安装

```bash
pnpm add @web-stream-player/rtsp-relay
```

当前 npm 发布状态见[安装与发布状态](/guide/installation)。仓库内可以直接运行构建后的 CLI：

```bash
pnpm build
node packages/rtsp-relay/dist/cli.js ./relay.config.json
```

## 完整配置

```json
{
  "host": "127.0.0.1",
  "port": 8787,
  "ffmpegPath": "/usr/local/bin/ffmpeg",
  "accessToken": "replace-with-a-random-secret",
  "idleTimeoutMs": 5000,
  "maxClientBufferBytes": 4194304,
  "streams": {
    "gate-east": {
      "label": "东门摄像头",
      "url": "rtsp://viewer:password@10.10.20.31:554/stream1",
      "rtspTransport": "tcp",
      "includeAudio": false
    },
    "warehouse-02": {
      "label": "二号仓库",
      "url": "rtsp://viewer:password@10.10.20.42:554/live",
      "rtspTransport": "tcp",
      "includeAudio": true,
      "ffmpegInputArgs": ["-stimeout", "5000000"]
    }
  }
}
```

## 配置字段

| 字段 | 默认值 | 说明 |
| --- | ---: | --- |
| `host` | `0.0.0.0` | Relay 监听地址，配合 Nginx 时建议使用 `127.0.0.1` |
| `port` | `8787` | HTTP 和 WebSocket 端口 |
| `ffmpegPath` | `ffmpeg` | FFmpeg 可执行文件路径 |
| `accessToken` | 无 | WebSocket 查询参数共享 Token |
| `idleTimeoutMs` | `5000` | 最后一个观看端离开后的进程回收延迟 |
| `maxClientBufferBytes` | `4194304` | 单客户端发送缓冲上限 |
| `streams` | 必填 | Stream ID 到 RTSP 配置的白名单 |

Stream ID 只能包含字母、数字、下划线和连字符。

## 单路配置字段

| 字段 | 默认值 | 说明 |
| --- | ---: | --- |
| `url` | 必填 | 服务端 RTSP URL |
| `label` | Stream ID | `/streams` 返回的展示名称 |
| `rtspTransport` | `tcp` | `tcp` 或 `udp` |
| `includeAudio` | `false` | 是否复制可选音频轨 |
| `ffmpegInputArgs` | `[]` | 放在 `-i` 之前的额外输入参数 |

`ffmpegInputArgs` 只允许运维控制的配置，不应暴露给浏览器或普通用户。

## HTTP 接口

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/streams
```

`GET /health` 示例：

```json
{
  "ok": true,
  "streams": [
    {
      "streamId": "gate-east",
      "clients": 2,
      "running": true,
      "bytesSent": 34567890,
      "droppedChunks": 0
    }
  ]
}
```

`GET /streams` 只暴露 ID 和 Label，不返回 RTSP URL。

## WebSocket 路径

```text
ws://127.0.0.1:8787/stream/gate-east?token=replace-with-a-random-secret
```

路径不存在返回 404，Token 错误返回 401。

## 进程管理

生产环境使用 systemd、Docker、Kubernetes 或其他进程管理器。关键要求：

- Relay 异常退出后自动拉起。
- 优雅停止时等待 `close()` 回收 FFmpeg。
- 限制日志保留时间，避免 RTSP 错误持续写满磁盘。
- 监控 `/health` 的 `running`、`clients`、`droppedChunks` 和 `lastError`。
- 对摄像头网络设置独立 ACL。

## FFmpeg 行为

默认命令逻辑：

```bash
ffmpeg \
  -hide_banner \
  -loglevel warning \
  -fflags nobuffer \
  -flags low_delay \
  -rtsp_transport tcp \
  -i 'rtsp://...' \
  -map 0:v:0 \
  -an \
  -c copy \
  -f mpegts \
  -mpegts_flags +resend_headers \
  -muxdelay 0 \
  -muxpreload 0 \
  pipe:1
```

`-c copy` 表示不解码、不重新编码。Codec 不兼容浏览器时，Relay 不会自动修复，应由上游提供 H.264 备选流或单独增加转码服务。
