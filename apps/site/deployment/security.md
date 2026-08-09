---
title: 鉴权与安全边界
description: 保护 RTSP 摄像头、Relay、Token 和浏览器访问边界。
---

# 鉴权与安全边界

RTSP Relay 位于浏览器和内网摄像头之间。它拥有访问内网设备的能力，安全边界必须比普通静态资源服务更严格。

## 绝对不要接受任意 RTSP URL

如果浏览器可以提交 `rtsp://host/path` 并让 Relay 打开，会形成 SSRF 和内网扫描入口。攻击者可能访问管理端口、云元数据地址和其他内网服务。

本项目只根据路径中的 Stream ID 查找服务端配置：

```text
/stream/gate-east -> config.streams["gate-east"].url
```

浏览器传入的 `StreamSource.url` 不会成为 FFmpeg 输入。

## 摄像头凭据

- 放在未提交的配置、Secret Manager 或容器 Secret 中。
- 限制配置文件权限。
- 给摄像头创建只读观看账号。
- 不要在监控、异常上报和前端日志中记录完整 RTSP URL。
- Relay 会尝试从 FFmpeg 错误中遮蔽 `user:password@`，但不能替代日志审计。

## Token

内置 `accessToken` 是最低限度的共享密钥，不是完整用户身份系统。

```text
wss://relay.example.com/stream/gate-east?token=...
```

查询参数可能进入代理访问日志、浏览器诊断和监控系统。公网系统建议：

1. 业务后端先验证用户和摄像头权限。
2. 返回短期、限定 Stream ID 的签名 Token。
3. 在 Nginx、Gateway 或 Relay 扩展层验证签名。
4. 设置较短过期时间，避免长期共享 Token。
5. 清理或遮蔽代理查询参数日志。

## Origin 和网络 ACL

内置 Relay 未实现 Origin 白名单。生产部署至少配置：

- Nginx 或 Gateway Origin 校验。
- 防火墙只开放 443，不暴露 8787。
- Relay 到摄像头 VLAN 的最小网络权限。
- 每个 IP、用户和 Stream ID 的连接数限制。
- `/health` 和 `/streams` 仅向运维网络开放。

## TLS

- 网页使用 HTTPS。
- 浏览器只连接 WSS。
- Relay 内网到 Nginx 可以使用回环 HTTP。
- 跨主机链路根据网络边界决定是否继续使用 TLS。

## 慢客户端和内存

`maxClientBufferBytes` 防止单个慢客户端无限堆积发送缓冲。超过阈值时 Relay 丢弃该客户端的 Chunk，并增加 `droppedChunks`。

这是一道资源保护措施，不是画面完整性保证。持续丢块应断开或降级该观看端，并检查出口带宽和网络质量。

## FFmpeg 参数

`ffmpegInputArgs` 只能来自受控配置。不要允许普通用户拼接参数，避免文件访问、网络访问和协议滥用。

## 上线检查表

- [ ] Relay 只监听内网或 `127.0.0.1`
- [ ] 浏览器只访问 WSS
- [ ] Stream ID 来自白名单
- [ ] 摄像头使用只读账号
- [ ] RTSP URL 和 Token 不进入 Git
- [ ] Origin、ACL 和连接限流已启用
- [ ] `/health` 不公开给互联网
- [ ] 查询参数日志已遮蔽
- [ ] 依赖、Node.js 和 FFmpeg 定期更新
- [ ] 已测试慢客户端、断网、摄像头离线和进程重启
