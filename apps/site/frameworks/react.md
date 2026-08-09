---
title: React 接入
description: 在 React 18+ 中使用 WebStreamPlayer、回调和 ref 方法。
---

# React 接入

## 安装

```bash
pnpm add web-stream-player @web-stream-player/react react
```

## 基础组件

```tsx
import { useMemo, useState } from 'react'
import {
  WebStreamPlayer,
  type PlayerStats
} from '@web-stream-player/react'

export function Camera() {
  const [stats, setStats] = useState<PlayerStats>()
  const source = useMemo(() => ({
    url: '/live/camera/index.m3u8',
    protocol: 'hls' as const,
    isLive: true
  }), [])

  return (
    <section>
      <WebStreamPlayer
        className="camera-player"
        source={source}
        autoplay
        muted
        onStats={setStats}
        onPlayerError={({ error }) => console.error(error)}
      />
      <output>{stats?.fps?.toFixed(1) ?? '--'} fps</output>
    </section>
  )
}
```

```css
.camera-player {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  background: #101411;
}
```

## Props

| Prop | 类型 | 默认值 |
| --- | --- | ---: |
| `source` | `StreamSource` | 必填 |
| `autoplay` | `boolean` | `true` |
| `muted` | `boolean` | `true` |
| `controls` | `boolean` | `false` |
| `options` | `Partial<WebStreamPlayerOptions>` | `undefined` |
| `onPlayerError` | Error 回调 | `undefined` |
| `onStats` | Stats 回调 | `undefined` |
| `onStateChange` | State 回调 | `undefined` |

普通 `div` 属性会传给根节点。

## Ref 方法

```tsx
import { useRef } from 'react'
import {
  WebStreamPlayer,
  type WebStreamPlayerRef
} from '@web-stream-player/react'

export function Camera() {
  const ref = useRef<WebStreamPlayerRef>(null)

  return (
    <>
      <WebStreamPlayer ref={ref} source={source} muted />
      <button type="button" onClick={() => ref.current?.play()}>播放</button>
      <button type="button" onClick={() => ref.current?.pause()}>暂停</button>
      <button type="button" onClick={() => ref.current?.reload()}>重新加载</button>
    </>
  )
}
```

Ref 暴露 `player`、`play()`、`pause()` 和 `reload()`。组件卸载时自动销毁 Player。

## 切换 source

组件在 `source` 引用变化时调用 `load()`。不要在每次渲染时创建无意义的新对象，建议使用 state 或 `useMemo`。

```tsx
const [source, setSource] = useState<StreamSource>({
  url: '/live/a/index.m3u8',
  protocol: 'hls'
})

setSource({
  url: 'wss://media.example.com/live/b.ts',
  protocol: 'mpegts',
  transport: 'websocket'
})
```
