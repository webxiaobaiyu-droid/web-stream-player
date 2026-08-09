---
title: 容量与多观看端
description: 估算 RTSP Relay 的 FFmpeg 进程、CPU、内存和出口带宽。
---

# 容量与多观看端

Relay 采用按 Stream ID 共享的 Stream Hub。容量规划需要分别计算输入路数、活跃观看端、出口带宽和慢客户端。

## 进程模型

```text
active FFmpeg processes = active Stream IDs
```

同一摄像头的多个观看端共享一个 FFmpeg stdout。两个不同 Stream ID 会启动两个 FFmpeg 进程，即使它们意外配置成同一个 RTSP URL。

## 出口带宽

```text
relay egress = stream bitrate x viewer count
```

例如一条 4 Mb/s 摄像头：

| 观看端 | 理论媒体出口 | 建议预留后估算 |
| ---: | ---: | ---: |
| 1 | 4 Mb/s | 至少 5 Mb/s |
| 2 | 8 Mb/s | 至少 10 Mb/s |
| 10 | 40 Mb/s | 至少 50 Mb/s |
| 50 | 200 Mb/s | 至少 250 Mb/s |

预留空间用于容器、WebSocket、TCP/TLS 开销和码率波动。真实 VBR 摄像头应使用峰值而不是平均码率规划。

## 输入带宽

一条活跃 Stream ID 只建立一路 RTSP 输入，因此输入带宽近似等于全部活跃摄像头码率之和。

```text
relay ingress = sum(active camera bitrates)
```

## CPU

`-c copy` 不进行视频编码，CPU 主要用于：

- RTSP、TS 和 WebSocket 协议处理。
- 内存复制和多客户端广播。
- TLS，若在同一进程或主机终止。
- Node.js 事件循环和监控。

它明显低于视频转码，但不能当成零成本。高观看端数量时，TLS 和数据复制会成为主要开销。

## 内存

内存包括：

- Node Relay 基础 RSS。
- 每个活跃 FFmpeg 进程 RSS。
- 每个 WebSocket 连接和 Socket Buffer。
- 慢客户端的 `bufferedAmount`。

当前实测中，双观看端 Relay 平均 RSS 为 55.52 MiB，单个 FFmpeg 平均 RSS 为 25.40 MiB。该数字只代表指定环境。

## 首包时间

首包受到 RTSP 建连、FFmpeg 启动、摄像头 GOP 和关键帧等待影响。减少网页代码体积不能消除上游关键帧等待。

## 扩容方式

1. 按 Stream ID 一致性哈希到固定 Relay 节点，保证同一摄像头继续共享。
2. 在边缘层做鉴权和连接限流。
3. 监控每台节点的 egress、连接数、Event Loop Lag 和 droppedChunks。
4. 超过单机出口或文件描述符上限时横向扩容。
5. 超大规模分发可将 Relay 输出接入专业流媒体分发层。

## 压测命令

```bash
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 1 32
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 2 32
```

完整方法和限制见[性能实测](/benchmarks)。
