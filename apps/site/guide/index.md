---
title: 项目概览
description: 了解 Web Stream Player 的定位、支持范围和浏览器播放链路。
---

# 项目概览

Web Stream Player 是一个基于 Adapter 的 TypeScript 浏览器播放器。它统一管理加载、播放、暂停、销毁、能力检测、状态、错误和统计，协议解析仍交给对应的成熟引擎。

::: tip 先理解定位
这是多协议应用的集成层，不是 hls.js 或 mpegts.js 的重新实现。只做单一 HLS 播放时，直接使用 hls.js 可能更简单。
:::

## 支持范围

| 输入 | 传输 | 播放链路 | 当前状态 |
| --- | --- | --- | --- |
| HLS H.264/AAC | HTTP(S) | 原生 HLS 或 hls.js + MSE | 稳定 |
| FLV H.264/AAC | HTTP(S)、WebSocket | mpegts.js + MSE | 稳定 |
| MPEG-TS H.264/AAC | HTTP(S)、WebSocket | mpegts.js + MSE | 稳定 |
| RTSP H.264 | RTSP 到 Relay，WS(S) 输出 TS | FFmpeg stream copy + mpegts.js | 稳定 |
| HLS/FLV/TS/RTSP H.265 | HTTP(S)、WS(S) | 浏览器暴露 HEVC MSE 时可用 | 取决于运行环境 |
| 裸 H.264 Annex-B | Fetch stream、WebSocket | WebCodecs + Canvas | 实验性 |
| 裸 H.265 Annex-B | Fetch stream、WebSocket | WebCodecs + Canvas | 实验性且依赖环境 |
| WASM H.264/H.265 | Fetch stream、WebSocket | 注入 `WasmDecoderFactory` | 只提供接口 |
| MP4、WebM | HTTP(S)、blob、data URL | 原生 `<video>` | 稳定 |

## 数据链路

```text
StreamSource
    |
    v
能力检测和协议推断
    |
    v
Adapter Registry 选择最高分 Adapter
    |
    +-- HLS -> 原生 HLS / hls.js
    +-- FLV / TS -> mpegts.js
    +-- RTSP -> Relay -> MPEG-TS over WebSocket -> mpegts.js
    +-- Annex-B -> WebCodecs / 业务注入的 WASM Decoder
    +-- MP4 / WebM -> 原生 video
```

## 从哪里开始

- 第一次运行项目：阅读[安装与发布状态](./installation)。
- 快速播放一条 HLS：阅读[五分钟接入](./quick-start)。
- 接摄像头 RTSP：直接进入[RTSP 协议接入](/protocols/rtsp)。
- 接裸 H.264/H.265 字节流：阅读[Annex-B 接入](/protocols/annexb)。
- 准备上线：阅读[Relay 部署](/deployment/relay)和[安全边界](/deployment/security)。
- 不确定用哪个项目：阅读[播放器选择指南](./choosing)。

## 设计目标

1. 同一业务代码可以在不同协议间切换。
2. 协议包可以按需安装和拆分，避免无关引擎进入产物。
3. 诊断数据属于播放器 API，不依赖具体框架组件。
4. RTSP 摄像头地址和凭据只留在服务器。
5. 每个 Adapter 都有明确的探测、挂载和销毁边界。

## 非目标

- 不在浏览器里直接建立 RTSP TCP/UDP 连接。
- 不承诺所有 Chrome 版本都能播放 H.265。
- 不内置完整 WASM 视频解码器。
- 不把 stream copy 描述成转码，也不承诺零带宽成本。
