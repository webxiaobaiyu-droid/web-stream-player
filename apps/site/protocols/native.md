---
title: MP4 / WebM 原生媒体
description: 使用浏览器原生 video 播放 MP4、WebM、blob 和 data URL。
---

# MP4 / WebM 原生媒体

浏览器已经支持的媒体不需要额外协议引擎。Native Adapter 使用 `<video>` 加载 URL，并复用统一 Player 生命周期。

## MP4

```ts
await player.load({
  url: 'https://media.example.com/video/demo.mp4',
  protocol: 'native',
  isLive: false,
  mimeType: 'video/mp4'
})

await player.play()
```

## WebM

```ts
await player.load({
  url: '/assets/demo.webm',
  protocol: 'native',
  isLive: false,
  mimeType: 'video/webm'
})
```

## blob URL

```ts
const file = input.files?.[0]
if (!file) throw new Error('Select a file first.')

const objectUrl = URL.createObjectURL(file)

try {
  await player.load({
    url: objectUrl,
    protocol: 'native',
    isLive: false
  })
} finally {
  // 确认播放器不再使用该 URL 后再回收。
  URL.revokeObjectURL(objectUrl)
}
```

## 注意事项

- 是否能播放由浏览器支持的容器和 Codec 组合决定。
- 大型 MP4 建议支持 HTTP Range Request。
- 跨域截图需要媒体服务器正确设置 CORS，否则 Canvas 会被污染。
- 受 DRM 保护的媒体需要单独的 EME 集成，当前项目未内置。
