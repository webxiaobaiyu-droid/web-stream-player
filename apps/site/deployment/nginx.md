---
title: Nginx 与 WSS
description: 用 Nginx 为 RTSP Relay 提供 HTTPS、WebSocket 代理和健康检查入口。
---

# Nginx 与 WSS

生产页面通常运行在 HTTPS 下，因此 Relay 必须通过 WSS 暴露。让 Node Relay 只监听 `127.0.0.1:8787`，由 Nginx 负责 TLS 和公网边界。

## HTTP Context

在 Nginx `http` 配置块中定义 Upgrade 映射：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

## Server 配置

```nginx
server {
    listen 443 ssl http2;
    server_name relay.example.com;

    ssl_certificate     /etc/letsencrypt/live/relay.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.example.com/privkey.pem;

    location /stream/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
        proxy_buffering off;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8787/health;
        allow 10.0.0.0/8;
        allow 127.0.0.1;
        deny all;
    }

    location = /streams {
        proxy_pass http://127.0.0.1:8787/streams;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

浏览器地址：

```text
wss://relay.example.com/stream/gate-east?token=short-lived-token
```

## Origin 校验

内置 Relay 当前不校验 Origin。公网部署应在 Nginx 或上游鉴权服务限制允许的站点。

```nginx
map $http_origin $allowed_origin {
    default 0;
    "https://app.example.com" 1;
}

location /stream/ {
    if ($allowed_origin = 0) { return 403; }

    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Origin $http_origin;
    proxy_read_timeout 1h;
    proxy_buffering off;
}
```

复杂鉴权建议使用 `auth_request`、API Gateway 或专用边缘服务，不要在 Nginx `if` 中堆积完整业务逻辑。

## 代理超时

WebSocket 是长连接。默认 60 秒超时很容易造成周期性断流。`proxy_read_timeout` 应覆盖最长无数据窗口，同时结合 TCP Keepalive 和应用健康检查。

## 证书

可以使用 Certbot 申请和续期 Let's Encrypt 证书：

```bash
sudo certbot --nginx -d relay.example.com
sudo certbot renew --dry-run
```

证书续期后确认 Nginx Reload 生效。

## 常见代理错误

- 返回 `400 Bad Request`：通常缺少 Upgrade Header。
- HTTPS 页面连接失败：检查是否仍使用 `ws://`。
- 固定 60 秒断开：检查 `proxy_read_timeout` 和上游 LB 超时。
- 连接成功无数据：检查 Relay 日志、FFmpeg 进程和摄像头关键帧。
