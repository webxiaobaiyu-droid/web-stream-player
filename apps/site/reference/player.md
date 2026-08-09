---
title: Player API
description: StreamPlayer 创建参数、状态和公开方法参考。
---

# Player API

## 创建默认播放器

```ts
import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  autoplay: false,
  muted: true,
  controls: false,
  adapterOptions: {
    hls: { lowLatencyMode: true },
    mpegts: { liveBufferLatencyChasing: true },
    annexb: { maxDecodeQueueSize: 8 }
  }
})
```

## StreamPlayerOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | ---: | --- |
| `target` | `HTMLElement \| string` | 必填 | 挂载节点或 CSS Selector |
| `adapters` | `StreamAdapter[]` | 默认 Adapter | 完全替换 Adapter 列表 |
| `autoplay` | `boolean` | `false` | `load()` 完成后自动调用 `play()` |
| `muted` | `boolean` | `true` | 初始静音 |
| `controls` | `boolean` | `false` | 原生 video Controls |

`createWebStreamPlayer()` 还接受 `adapterOptions`，分别配置 HLS、mpegts.js、Annex-B 和附加 Adapter。

## 状态

```ts
type PlayerState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'ended'
  | 'error'
  | 'destroyed'
```

读取当前状态：

```ts
console.log(player.currentState)
```

## 方法

### load(source)

释放旧 Session、标准化 Source、检测能力、选择 Adapter 并挂载新 Session。

```ts
await player.load({
  url: '/live/index.m3u8',
  protocol: 'hls'
})
```

### play()

```ts
await player.play()
```

没有先 `load()` 会抛出 `INVALID_SOURCE`。

### pause()

```ts
player.pause()
```

### seek(time)

```ts
player.seek(30)
```

只有当前 Adapter Session 实现 `seek()` 时生效。直播流通常不应依赖任意 Seek。

### setMuted(muted)

```ts
player.setMuted(false)
```

### setVolume(volume)

```ts
player.setVolume(0.6)
```

输入会被限制在 `0` 到 `1`。

### stop()

```ts
await player.stop()
```

调用当前 Session 的可选 `stop()`，状态回到 `ready`。不同 Adapter 的 Stop 语义不同。

### destroy()

```ts
await player.destroy()
```

幂等释放当前 Session、媒体 Surface 和事件监听。销毁后的实例不能再次使用。

### use(adapter)

```ts
player.use(customAdapter)
```

向 Registry 追加 Adapter。销毁后调用会抛出 `DESTROYED`。

### on(type, listener)

```ts
const unsubscribe = player.on('stats', (stats) => {
  console.table(stats)
})

unsubscribe()
```

### once(type, listener)

```ts
player.once('metadata', (metadata) => {
  console.log(metadata)
})
```

## 错误码

```ts
type PlayerErrorCode =
  | 'INVALID_SOURCE'
  | 'NO_ADAPTER'
  | 'ADAPTER_ATTACH_FAILED'
  | 'UNSUPPORTED_CODEC'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'DESTROYED'
```

Adapter 内部错误也可能以普通 `Error` 进入 `error` 事件。业务不要只根据 Error Class 判断是否需要告警。
