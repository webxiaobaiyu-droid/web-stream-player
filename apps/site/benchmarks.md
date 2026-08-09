---
title: 性能实测
description: RTSP stream-copy Relay 的测试环境、方法、结果、产物体积和限制。
---

# 性能实测

这些数字描述一次受控测试，不是对所有摄像头、网络、Codec、浏览器和机器的性能承诺。

## 环境

| 项目 | 值 |
| --- | --- |
| 日期 | 2026-08-09 |
| 机器 | MacBook Air |
| 处理器 | Apple M4，10 cores |
| 内存 | 32 GB |
| 操作系统 | macOS 26.5.2 |
| Node.js | 18.19.1 |
| FFmpeg | 8.1.2 |
| 输入 | H.264，1920x1080，25 fps，约 4.16 Mb/s |
| RTSP Transport | TCP |
| Relay 输出 | MPEG-TS over WebSocket，FFmpeg `-c copy` |

## Relay 结果

客户端连接持续 32 秒。收到首个媒体 Chunk 后，对进程 CPU Time 和 RSS 采样 30 秒。

| 场景 | 首个媒体 | 每观看端 | 总出口 | Relay CPU | Relay RSS | FFmpeg CPU | FFmpeg RSS | FFmpeg 进程 | 丢块 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 viewer | 2.42 s | 4.31 Mb/s | 4.31 Mb/s | 1.07% | 54.79 MiB | 0.77% | 25.36 MiB | 1 | 0 |
| 2 viewers | 2.08 s | 4.32 Mb/s | 8.64 Mb/s | 1.10% | 55.52 MiB | 0.70% | 25.40 MiB | 1 | 0 |

CPU 是进程 CPU Time 除以 Wall Time，100% 表示占满一个 CPU Core。RSS 是 30 次一秒间隔样本的平均值。

## 结论

第二个观看端让 WebSocket 出口带宽接近翻倍，但没有增加 RTSP 输入和 FFmpeg 进程。Relay CPU 在该环境中基本不变。

这验证的是当前 Stream Hub 的共享形态，不代表大量观看端时 CPU 永远不变。连接数、TLS、Socket Buffer 和内存复制最终都会增加开销。

## 复现传输测试

启动 RTSP Source 并配置 Relay 后运行：

```bash
pnpm build
node packages/rtsp-relay/dist/cli.js ./relay.config.json
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 1 32
pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 2 32
curl http://127.0.0.1:8787/health
```

基准脚本会等每个客户端收到首个媒体 Chunk，再重置字节和消息计数。启动时间与稳定传输吞吐分开记录。

macOS 进程采样：

```bash
ps -p <pid> -o time=,rss=
```

记录 30 秒窗口前后的 CPU Time，计算差值并除以 30。RSS 每秒采样一次。Linux 可以使用 `pidstat`、`ps` 或容器指标实现相同测量。

## 官网构建体积

以下是旧版协议工作台在同一提交下的 Vite 分块，已四舍五入：

| Chunk | Minified | Gzip |
| --- | ---: | ---: |
| Playground App JavaScript | 41.9 KB | 14.6 KB |
| Playground CSS | 15.2 KB | 3.6 KB |
| Vue 和图标 | 74.7 KB | 28.3 KB |
| mpegts.js Engine | 264.3 KB | 62.2 KB |
| hls.js Engine | 524.0 KB | 162.1 KB |

这些是 Playground Chunk，不代表每个业务安装都会打入全部代码。只安装 HLS Adapter 时不需要 MPEG-TS 路径，反之亦然。

## 限制

- 输入来自合成局域网 Source，不是拥塞的真实摄像头网络。
- 每个场景只记录一次，不构成统计分布。
- 输入 Codec 是 H.264。
- H.265 依赖浏览器、系统、硬件和 Codec 参数。
- stream copy 避免编码开销，但不消除带宽成本。
- 首包包含 RTSP 连接、关键帧等待、FFmpeg 启动和本机调度。
- 没有覆盖 10、100 或更多并发观看端。

仓库中的原始报告见 [`BENCHMARKS.md`](https://github.com/webxiaobaiyu-droid/web-stream-player/blob/main/BENCHMARKS.md)。
