---
title: 按需组合 Adapter
description: 只安装业务需要的核心和协议包，或注册自定义 Adapter。
---

# 按需组合 Adapter

完整包默认注册 HLS、FLV/MPEG-TS、Annex-B 和 Native Adapter。只使用少数协议时，可以直接组合 Core。

## 只安装 HLS

```bash
pnpm add @web-stream-player/core @web-stream-player/hls
```

```ts
import {
  StreamPlayer,
  createNativeVideoAdapter
} from '@web-stream-player/core'
import { createHlsAdapter } from '@web-stream-player/hls'

const player = new StreamPlayer({
  target: '#player',
  adapters: [
    createHlsAdapter({ lowLatencyMode: true }),
    createNativeVideoAdapter()
  ],
  muted: true
})
```

## FLV 和 MPEG-TS

```bash
pnpm add @web-stream-player/core @web-stream-player/mpegts
```

```ts
import { StreamPlayer } from '@web-stream-player/core'
import { createMpegTsAdapter } from '@web-stream-player/mpegts'

const player = new StreamPlayer({
  target: '#player',
  adapters: [createMpegTsAdapter({
    lazyLoad: false,
    liveBufferLatencyChasing: true
  })]
})
```

## Adapter 选择规则

每个 Adapter 的 `probe()` 返回分数：

- `0` 表示不支持当前 Source 或运行环境。
- 分数更高的 Adapter 优先。
- 同分时保持注册顺序。

默认分数大致为：原生 HLS `100`、WebCodecs Annex-B `100`、mpegts.js `95`、hls.js `90`、WASM Annex-B `70`、Native `10`。

## 添加业务 Adapter

```ts
import type { StreamAdapter } from '@web-stream-player/core'

const businessAdapter: StreamAdapter = {
  id: 'business-native',
  name: 'Business Native Video',
  probe: ({ source }) => (
    source.protocol === 'native' && source.metadata?.business === true
      ? 80
      : 0
  ),
  async attach({ source, surface, signal }) {
    const video = surface.video({ muted: true, playsInline: true })
    video.src = source.url

    signal.addEventListener('abort', () => video.pause(), { once: true })

    return {
      play: () => video.play(),
      pause: () => video.pause(),
      setMuted: (muted) => { video.muted = muted },
      destroy: () => surface.clear()
    }
  }
}

const player = new StreamPlayer({
  target: '#player',
  adapters: [businessAdapter]
})
```

完整契约见[自定义 Adapter](/reference/adapter)。
