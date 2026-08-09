---
title: Vue 3 接入
description: 在 Vue 3 中使用 WebStreamPlayer 组件、事件和实例方法。
---

# Vue 3 接入

## 安装

```bash
pnpm add web-stream-player @web-stream-player/vue vue
```

当前 npm 发布状态见[安装与发布状态](/guide/installation)。

## 基础组件

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  WebStreamPlayer,
  type PlayerStats,
  type StreamSource
} from '@web-stream-player/vue'

const muted = ref(true)
const stats = ref<PlayerStats>()

const source: StreamSource = {
  url: '/live/camera/index.m3u8',
  protocol: 'hls',
  isLive: true
}
</script>

<template>
  <WebStreamPlayer
    class="camera-player"
    :source="source"
    :autoplay="true"
    :muted="muted"
    :controls="false"
    @stats="stats = $event"
    @error="console.error($event.error)"
  />
</template>

<style scoped>
.camera-player {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  background: #101411;
}
</style>
```

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | ---: | --- |
| `source` | `StreamSource` | 必填 | 当前输入流 |
| `autoplay` | `boolean` | `true` | `load()` 完成后尝试播放 |
| `muted` | `boolean` | `true` | 静音状态 |
| `controls` | `boolean` | `false` | 原生 video 控件，仅 video Surface 生效 |
| `options` | `Partial<WebStreamPlayerOptions>` | `{}` | Adapter 配置和其他 Player 选项 |

## Events

| Event | Payload |
| --- | --- |
| `ready` | `StreamPlayer` |
| `statechange` | `{ state, previous }` |
| `error` | `{ error, fatal, adapterId? }` |
| `stats` | `PlayerStats` |
| `metadata` | `StreamMetadata` |

```vue
<WebStreamPlayer
  :source="source"
  @ready="onReady"
  @statechange="onStateChange"
  @metadata="onMetadata"
  @error="onError"
/>
```

## 切换流

组件会深度监听 `source`，内容变化后重新加载。推荐替换完整对象，便于状态管理和日志记录。

```ts
const source = ref<StreamSource>({
  url: '/live/a/index.m3u8',
  protocol: 'hls'
})

function openCameraB() {
  source.value = {
    url: 'wss://media.example.com/live/camera-b.ts',
    protocol: 'mpegts',
    transport: 'websocket'
  }
}
```

## 调用实例方法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { WebStreamPlayer } from '@web-stream-player/vue'

const playerRef = ref<InstanceType<typeof WebStreamPlayer>>()

async function resume() {
  await playerRef.value?.play()
}

function pause() {
  playerRef.value?.pause()
}
</script>

<template>
  <WebStreamPlayer ref="playerRef" :source="source" />
</template>
```

组件暴露 `player`、`load()`、`play()`、`pause()` 和 `getState()`。卸载时会自动调用 `destroy()`。

## RTSP

```ts
const source: StreamSource = {
  url: 'rtsp://configured-on-relay/workshop-01',
  protocol: 'rtsp',
  relayUrl: 'wss://relay.example.com/stream/workshop-01?token=***'
}
```

完整服务端配置见[RTSP Relay](/deployment/relay)。
