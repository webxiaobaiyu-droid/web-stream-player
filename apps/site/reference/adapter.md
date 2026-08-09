---
title: 自定义 Adapter
description: 实现 probe、attach、AdapterSession、AbortSignal 和资源释放契约。
---

# 自定义 Adapter

Adapter 把协议或播放引擎接入统一 Player。一个可用 Adapter 必须正确回答两个问题：当前 Source 能不能处理，以及销毁时需要释放什么。

## 接口

```ts
interface StreamAdapter {
  readonly id: string
  readonly name: string
  probe(context: AdapterProbeContext): number | Promise<number>
  attach(context: AdapterContext): Promise<AdapterSession>
}
```

## 完整示例

```ts
import type {
  AdapterSession,
  StreamAdapter
} from '@web-stream-player/core'

export function createSignedNativeAdapter(): StreamAdapter {
  return {
    id: 'signed-native',
    name: 'Signed Native Video',

    probe: ({ source }) => {
      if (source.protocol !== 'native') return 0
      return source.metadata?.signed === true ? 80 : 0
    },

    async attach({ source, surface, signal, emit }): Promise<AdapterSession> {
      const video = surface.video({
        muted: true,
        controls: false,
        playsInline: true
      })

      const onLoadedMetadata = () => {
        emit('metadata', {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        })
      }

      const onError = () => {
        emit('error', {
          error: new Error('Native media failed.'),
          fatal: true,
          adapterId: 'signed-native'
        })
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)
      video.src = source.url

      const abort = () => video.pause()
      signal.addEventListener('abort', abort, { once: true })

      return {
        play: () => video.play(),
        pause: () => video.pause(),
        setMuted: (muted) => { video.muted = muted },
        setVolume: (volume) => { video.volume = volume },
        seek: (time) => { video.currentTime = time },
        destroy: () => {
          signal.removeEventListener('abort', abort)
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          video.removeAttribute('src')
          video.load()
          surface.clear()
        }
      }
    }
  }
}
```

## Probe 规则

- 不支持返回 `0`。
- 越确定的专用 Adapter 分数越高。
- 不要在 Probe 中产生持久连接或修改 DOM。
- 异步 Codec 检测可以返回 Promise。
- 同分保持注册顺序。

## Surface

```ts
surface.video(options)
surface.canvas(options)
surface.clear()
```

同一 Session 只应维护自己创建的 Surface。切换流和销毁时 Player 还会调用 `surface.clear()`，Adapter 的 `destroy()` 仍需要释放引擎、Timer、Worker、Decoder 和事件监听。

## AbortSignal

新 Source 加载时，Player 会 Abort 旧 AdapterContext。网络请求和长任务应接入该 Signal。

```ts
const response = await fetch(source.url, { signal })
```

## Session 方法

| 方法 | 必填 | 说明 |
| --- | --- | --- |
| `play()` | 是 | 开始或恢复播放 |
| `pause()` | 是 | 暂停播放 |
| `destroy()` | 是 | 完整释放资源 |
| `stop()` | 否 | 停止输入但保留 Session |
| `setMuted()` | 否 | 设置静音 |
| `setVolume()` | 否 | 设置音量 |
| `seek()` | 否 | 跳转时间 |

## 注册

```ts
const player = createWebStreamPlayer({
  target: '#player',
  adapterOptions: {
    additional: [createSignedNativeAdapter()]
  }
})
```

或直接使用 Core：

```ts
const player = new StreamPlayer({
  target: '#player',
  adapters: [createSignedNativeAdapter()]
})
```
