# Web Stream Player

One browser API for HLS, HTTP/WS-FLV, HTTP/WS MPEG-TS, raw H.264/H.265, and RTSP streams routed through a no-transcode relay.

[Simplified Chinese](./README.zh-CN.md) | [Contributing](./CONTRIBUTING.md) | [Security](./SECURITY.md)

[Live protocol workbench](https://webxiaobaiyu-droid.github.io/web-stream-player/) | [Measured relay performance](./BENCHMARKS.md)

Web Stream Player is an adapter-first TypeScript SDK. Install the complete player for a useful default stack, or compose only the protocol adapters your application needs. The included Vue workbench exposes adapter selection, runtime capabilities, bitrate, frame rate, buffering, dropped frames, screenshots, and player events.

![Web Stream Player protocol workbench playing an HLS sample](./docs/workbench-desktop.jpg)

> RTSP is not a browser protocol. The included relay opens one RTSP input per camera and remuxes it to MPEG-TS over WebSocket with FFmpeg `-c copy`. It does not decode or transcode the video.

## Feature matrix

| Input | Transport | Playback path | Status |
| --- | --- | --- | --- |
| HLS (H.264/AAC) | HTTP(S) | Native HLS or hls.js + MSE | Stable |
| FLV (H.264/AAC) | HTTP(S), WebSocket | mpegts.js + MSE | Stable |
| MPEG-TS (H.264/AAC) | HTTP(S), WebSocket | mpegts.js + MSE | Stable |
| RTSP (H.264) | RTSP to relay, MPEG-TS over WS(S) | FFmpeg stream copy + mpegts.js | Stable |
| HLS/FLV/TS/RTSP (H.265) | HTTP(S), WS(S) | MSE HEVC when the OS and browser expose it | Runtime-dependent |
| Raw Annex-B H.264 | Fetch stream, WebSocket | WebCodecs + Canvas | Experimental |
| Raw Annex-B H.265 | Fetch stream, WebSocket | WebCodecs + Canvas | Experimental and runtime-dependent |
| Raw H.264/H.265 with WASM | Fetch stream, WebSocket | Injectable `WasmDecoderFactory` | Integration API; decoder not bundled |
| MP4/WebM and browser-native media | HTTP(S), blob, data URL | Native `<video>` | Stable |
| WebTransport | WebTransport | Adapter contract reserved | Planned |

H.265 support cannot be inferred from the Chrome version alone. It depends on the operating system codec stack, hardware, browser build, profile, level, and container. Call `detectCapabilities()` and `supportsWebCodec('hevc')` at runtime, and provide H.264 fallback streams for broad deployment.

## Install

```bash
pnpm add web-stream-player
```

The default package includes HLS, FLV/MPEG-TS, Annex-B, and native-video adapters:

```ts
import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  muted: true,
  autoplay: false
})

player.on('error', ({ error }) => console.error(error))
player.on('stats', (stats) => console.table(stats))

await player.load({
  url: 'https://media.example.com/live/index.m3u8',
  protocol: 'hls'
})
await player.play()
```

The target element controls layout. Give it a stable width and aspect ratio:

```css
#player {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  background: #0e1312;
}
```

Autoplay with audio is normally blocked by browsers. Start muted or call `play()` from a user gesture.

## Source examples

```ts
// HTTP-FLV
await player.load({ url: '/live/camera.flv', protocol: 'flv' })

// MPEG-TS over WebSocket
await player.load({
  url: 'wss://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'websocket'
})

// Raw H.264 Annex-B over fetch streaming
await player.load({
  url: '/live/camera.h264',
  protocol: 'annexb',
  codec: 'avc',
  fps: 25
})
```

File extensions and query hints such as `?format=flv&codec=h264` are inferred when `protocol` or `codec` is omitted. Explicit values are recommended for extensionless live endpoints.

## RTSP relay

Install FFmpeg and the relay package on a machine that can reach the cameras:

```bash
pnpm add @web-stream-player/rtsp-relay
```

Create a configuration outside the public web root:

```json
{
  "host": "0.0.0.0",
  "port": 8787,
  "ffmpegPath": "ffmpeg",
  "accessToken": "replace-with-a-random-secret",
  "idleTimeoutMs": 5000,
  "maxClientBufferBytes": 4194304,
  "streams": {
    "workshop-01": {
      "label": "Workshop camera 01",
      "url": "rtsp://viewer:password@192.168.1.20:554/live",
      "rtspTransport": "tcp",
      "includeAudio": false
    }
  }
}
```

Start it with:

```bash
web-stream-relay ./relay.config.json
```

Then point the browser at the relay. The RTSP URL is descriptive client metadata; the relay only opens the allowlisted URL from its server-side configuration.

```ts
await player.load({
  url: 'rtsp://configured-on-relay/workshop-01',
  protocol: 'rtsp',
  relayUrl: 'wss://relay.example.com/stream/workshop-01?token=replace-with-a-random-secret'
})
```

The first viewer starts FFmpeg. Additional viewers share the same FFmpeg stdout through the stream hub. After the last viewer leaves, the process is stopped after `idleTimeoutMs`.

```mermaid
flowchart LR
  Camera["RTSP camera"] -->|"one input"| FFmpeg["FFmpeg -c copy"]
  FFmpeg -->|"MPEG-TS bytes"| Hub["Relay stream hub"]
  Hub -->|"WebSocket"| BrowserA["Browser A"]
  Hub -->|"WebSocket"| BrowserB["Browser B"]
  BrowserA --> MSE1["mpegts.js + MSE"]
  BrowserB --> MSE2["mpegts.js + MSE"]
```

The relay avoids video transcoding CPU/GPU cost, but network egress still scales with viewer count. Two viewers of a 4 Mb/s camera use roughly 8 Mb/s of relay egress.

In the documented Apple M4 test, one and two viewers both shared a single FFmpeg process with zero dropped relay chunks. The two-viewer run delivered 4.32 Mb/s per viewer while Relay CPU remained about 1.1%. See [BENCHMARKS.md](./BENCHMARKS.md) for the environment, process measurements, method, and limitations.

## Framework components

### Vue 3

```bash
pnpm add web-stream-player @web-stream-player/vue vue
```

```vue
<script setup lang="ts">
import { WebStreamPlayer } from '@web-stream-player/vue'

const source = {
  url: '/live/camera.flv',
  protocol: 'flv' as const
}
</script>

<template>
  <WebStreamPlayer
    :source="source"
    :muted="true"
    @stats="console.table"
  />
</template>
```

### React

```bash
pnpm add web-stream-player @web-stream-player/react react
```

```tsx
import { WebStreamPlayer } from '@web-stream-player/react'

export function Camera() {
  return (
    <WebStreamPlayer
      source={{ url: '/live/camera.ts', protocol: 'mpegts' }}
      muted
    />
  )
}
```

### Web Component

```ts
import { defineWebStreamPlayer } from '@web-stream-player/element'

defineWebStreamPlayer()
```

```html
<web-stream-player
  src="/live/camera.flv"
  protocol="flv"
  muted
></web-stream-player>
```

## Install only selected adapters

For tighter bundles, compose the core directly:

```bash
pnpm add @web-stream-player/core @web-stream-player/hls
```

```ts
import { StreamPlayer, createNativeVideoAdapter } from '@web-stream-player/core'
import { createHlsAdapter } from '@web-stream-player/hls'

const player = new StreamPlayer({
  target: '#player',
  adapters: [createHlsAdapter(), createNativeVideoAdapter()]
})
```

## Write an adapter

Adapters declare a deterministic probe score and return a disposable playback session:

```ts
import type { StreamAdapter } from '@web-stream-player/core'

const adapter: StreamAdapter = {
  id: 'my-protocol',
  name: 'My protocol',
  probe: ({ source, capabilities }) =>
    source.protocol === 'native' && capabilities.mse ? 80 : 0,
  attach: async ({ source, surface, signal, emit }) => {
    const video = surface.video({ muted: true })
    video.src = source.url
    signal.addEventListener('abort', () => video.pause(), { once: true })

    return {
      play: () => video.play(),
      pause: () => video.pause(),
      destroy: () => surface.clear()
    }
  }
}
```

A score of `0` means unsupported. Higher scores win, and equal scores preserve registration order.

## Architecture

```mermaid
flowchart TD
  Source["StreamSource"] --> Normalize["Protocol, codec, transport inference"]
  Normalize --> Registry["Adapter registry and async probe scoring"]
  Registry --> HLS["HLS adapter"]
  Registry --> TS["FLV / MPEG-TS adapter"]
  Registry --> AnnexB["Annex-B WebCodecs / WASM adapter"]
  Registry --> Native["Native video adapter"]
  HLS --> Video["HTMLVideoElement surface"]
  TS --> Video
  Native --> Video
  AnnexB --> Canvas["Canvas surface"]
  Video --> Events["Typed state, metadata, stats and error events"]
  Canvas --> Events
```

The core owns lifecycle, state, capability detection, adapter selection, events, and media surfaces. Protocol packages own network/demux/decode integration. Framework packages only bind component lifecycles to the core player.

## Local development

Requirements: Node.js 18+, pnpm 9, and FFmpeg for generating local media fixtures.

```bash
pnpm install
pnpm samples
pnpm dev
```

Open `http://localhost:5173`. The repository includes compact generated samples so the deployed workbench remains playable.

Set `VITE_REPOSITORY_URL` when deploying the workbench to link its header to your published GitHub repository.

Quality checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Security

- Never accept arbitrary client-provided RTSP URLs at the relay. That creates an SSRF and internal-network scanning endpoint.
- Keep camera credentials in a non-committed relay configuration or secret store.
- Terminate TLS at a reverse proxy and expose WSS to browsers in production.
- Protect relay and discovery endpoints with authentication appropriate to your deployment. The built-in token is a minimal shared-secret gate, not an identity system.
- Apply origin checks, rate limits, and network ACLs at the reverse proxy when exposing a relay outside a trusted network.

See [SECURITY.md](./SECURITY.md) for reporting and deployment notes.

## Roadmap

- Reference WASM decoder integration with worker-based rendering
- WebTransport byte-stream adapter
- Audio path for raw elementary streams
- Latency measurement and reconnect policy controls
- Automated cross-browser compatibility fixtures
- Optional WebGL renderer for decoded RGBA/YUV frames

## License

MIT
