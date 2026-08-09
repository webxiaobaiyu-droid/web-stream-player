---
title: Web Component 接入
description: 在原生 HTML 或任意框架中注册 web-stream-player 自定义元素。
---

# Web Component 接入

## 注册元素

```bash
pnpm add @web-stream-player/element
```

```ts
import { defineWebStreamPlayer } from '@web-stream-player/element'

defineWebStreamPlayer()
```

默认注册 `<web-stream-player>`。也可以传入业务前缀：

```ts
defineWebStreamPlayer('factory-stream-player')
```

## 使用

```html
<web-stream-player
  src="/live/camera/index.m3u8"
  protocol="hls"
  autoplay
  muted
></web-stream-player>
```

```css
web-stream-player {
  display: block;
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
}
```

## RTSP

```html
<web-stream-player
  src="rtsp://configured-on-relay/workshop-01"
  protocol="rtsp"
  relay-url="wss://relay.example.com/stream/workshop-01?token=***"
  muted
></web-stream-player>
```

## Attributes

| Attribute | 说明 |
| --- | --- |
| `src` | 输入 URL |
| `protocol` | `auto`、`native`、`hls`、`flv`、`mpegts`、`rtsp`、`annexb` |
| `codec` | `auto`、`avc`、`hevc` |
| `relay-url` | RTSP Relay 的 WS(S) 地址 |
| `autoplay` | 出现即为 `true` |
| `muted` | 缺省为静音，设置 `muted="false"` 可关闭静音 |

属性变化后会重新执行 `load()`。

## 方法

```ts
const element = document.querySelector('web-stream-player')

await element.play()
element.pause()
```

## DOM Events

事件会以 `CustomEvent` 冒泡，并穿过 Shadow DOM。

```ts
element.addEventListener('statechange', (event) => {
  console.log(event.detail.state)
})

element.addEventListener('stats', (event) => {
  console.table(event.detail)
})

element.addEventListener('playererror', (event) => {
  console.error(event.detail.error)
})
```

组件断开连接时会自动销毁 Player。
