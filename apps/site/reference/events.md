---
title: 事件与统计
description: PlayerEventMap、PlayerStats、StreamMetadata 和订阅释放方式。
---

# 事件与统计

事件系统是类型化的，`on()` 返回取消订阅函数。

```ts
const off = player.on('statechange', ({ state, previous }) => {
  console.log(previous, '->', state)
})

off()
```

## 事件列表

| Event | Payload | 说明 |
| --- | --- | --- |
| `statechange` | `{ state, previous }` | Player 状态变化 |
| `adapterchange` | `{ adapterId, adapterName }` | Adapter 选择完成 |
| `metadata` | `StreamMetadata` | Codec、尺寸、帧率和音频等信息 |
| `stats` | `PlayerStats` | 周期性播放统计 |
| `frame` | `{ timestamp, width, height }` | Annex-B 解码帧输出 |
| `error` | `{ error, fatal, adapterId? }` | 播放错误 |
| `warning` | `{ message, code?, detail? }` | 可诊断警告 |

## PlayerStats

```ts
interface PlayerStats {
  adapterId: string
  currentTime: number
  bufferedSeconds: number
  decodedFrames?: number
  droppedFrames?: number
  fps?: number
  bitrate?: number
  latency?: number
  width?: number
  height?: number
  extra?: Record<string, unknown>
}
```

不同 Adapter 能提供的字段不同。UI 必须处理 `undefined`。

```ts
player.on('stats', (stats) => {
  fpsLabel.textContent = stats.fps === undefined
    ? '--'
    : `${stats.fps.toFixed(1)} fps`

  bitrateLabel.textContent = stats.bitrate === undefined
    ? '--'
    : `${(stats.bitrate / 1_000_000).toFixed(2)} Mb/s`
})
```

## StreamMetadata

```ts
interface StreamMetadata {
  codec?: string
  width?: number
  height?: number
  fps?: number
  audioCodec?: string
  duration?: number
  extra?: Record<string, unknown>
}
```

元数据可能分阶段到达。不要假设 `load()` 返回时尺寸已经存在。

## Error

```ts
player.on('error', ({ error, fatal, adapterId }) => {
  logger.error('stream playback failed', {
    message: error.message,
    fatal,
    adapterId
  })

  if (fatal) showReconnectAction()
})
```

错误上报前应遮蔽 Token、签名 URL、摄像头地址和用户信息。

## 统计的含义

- `fps` 是采样窗口内解码帧变化，不等同于上游声明帧率。
- `bitrate` 是接收速度估算，不是精确编码码率。
- `bufferedSeconds` 对直播延迟有参考价值，但不等于端到端延迟。
- `droppedFrames` 来源随 Adapter 不同，跨协议比较时要保留 Adapter ID。
