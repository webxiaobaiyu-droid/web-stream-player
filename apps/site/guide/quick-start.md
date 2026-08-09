---
title: 五分钟接入
description: 创建播放器、加载视频流、监听事件并正确销毁实例。
---

# 五分钟接入

以下代码以 npm 包已经发布为前提。当前从源码验证的方式见[安装与发布状态](./installation)。

## 安装

```bash
pnpm add web-stream-player
```

## 准备容器

播放器不会替业务决定布局。请给容器稳定尺寸，避免媒体元数据到达后发生页面抖动。

```html
<div id="player"></div>
```

```css
#player {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  background: #101411;
}

#player > * {
  width: 100%;
  height: 100%;
}
```

## 创建和加载

```ts
import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  autoplay: false,
  muted: true,
  controls: true
})

player.on('statechange', ({ state, previous }) => {
  console.log(previous, '->', state)
})

player.on('stats', (stats) => {
  console.table(stats)
})

player.on('error', ({ error, fatal, adapterId }) => {
  console.error({ error, fatal, adapterId })
})

await player.load({
  url: 'https://media.example.com/live/index.m3u8',
  protocol: 'hls'
})

await player.play()
```

## 页面销毁时释放资源

`destroy()` 会终止当前请求、销毁 Adapter Session、清空媒体节点并移除事件监听。

```ts
window.addEventListener('pagehide', () => {
  void player.destroy()
}, { once: true })
```

在 Vue 或 React 中优先使用对应组件，组件会在卸载时自动销毁实例。

## 切换流

再次调用 `load()` 会先释放旧 Session，再重新选择 Adapter。

```ts
await player.load({
  url: 'wss://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'websocket'
})
```

## 自动推断

`.m3u8`、`.flv`、`.ts`、`.h264` 和 `.h265` 可以自动推断。没有扩展名的实时接口建议显式传入 `protocol`、`transport` 和 `codec`。

```ts
await player.load({
  url: 'wss://media.example.com/live?id=workshop-01',
  protocol: 'mpegts',
  transport: 'websocket',
  codec: 'avc',
  isLive: true
})
```

## 下一步

- [接入 HLS](/protocols/hls)
- [接入 FLV](/protocols/flv)
- [接入 MPEG-TS](/protocols/mpegts)
- [接入 RTSP](/protocols/rtsp)
- [Vue 3 组件](/frameworks/vue)
- [Player API](/reference/player)
