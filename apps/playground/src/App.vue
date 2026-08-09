<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Activity,
  Boxes,
  Cable,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Expand,
  ExternalLink,
  GitBranch,
  Layers3,
  LoaderCircle,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-vue-next'
import {
  createWebStreamPlayer,
  detectCapabilities,
  type PlaybackCapabilities,
  type PlayerState,
  type PlayerStats,
  type StreamPlayer,
  type StreamProtocol,
  type VideoCodec
} from 'web-stream-player'

interface Preset {
  name: string
  protocol: StreamProtocol
  codec: VideoCodec
  url: string
  relayUrl?: string
}

const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const presets: Preset[] = [
  { name: 'HLS sample', protocol: 'hls', codec: 'avc', url: withBase('samples/live.m3u8') },
  { name: 'HTTP-FLV sample', protocol: 'flv', codec: 'avc', url: withBase('samples/sample.flv') },
  { name: 'MPEG-TS sample', protocol: 'mpegts', codec: 'avc', url: withBase('samples/sample.ts') },
  { name: 'Raw H.264 sample', protocol: 'annexb', codec: 'avc', url: withBase('samples/sample.h264') },
  {
    name: 'RTSP relay',
    protocol: 'rtsp',
    codec: 'auto',
    url: 'rtsp://configured-on-relay/workshop-01',
    relayUrl: 'ws://localhost:8787/stream/workshop-01'
  }
]

const advantages = [
  {
    icon: Layers3,
    title: 'One source contract',
    body: 'Load HLS, FLV, MPEG-TS, raw Annex-B, native media, or an RTSP relay through the same typed player lifecycle.'
  },
  {
    icon: Cable,
    title: 'RTSP boundary included',
    body: 'The bundled relay turns an allowlisted RTSP input into MPEG-TS over WebSocket, so the browser never receives camera credentials.'
  },
  {
    icon: GitBranch,
    title: 'One camera input, many viewers',
    body: 'A stream hub shares one FFmpeg stdout across viewers instead of opening a separate RTSP session for every browser.'
  },
  {
    icon: Boxes,
    title: 'Replaceable playback paths',
    body: 'Use the default stack or install only the core and adapters you need. Custom adapters participate in the same probe and cleanup rules.'
  },
  {
    icon: Activity,
    title: 'Diagnostics are part of the API',
    body: 'Typed state, metadata, warnings, bitrate, buffering, decoded frames, and dropped frames are available without framework-specific wiring.'
  }
]

const comparisons = [
  {
    project: 'Web Stream Player',
    href: 'https://github.com/webxiaobaiyu-droid/web-stream-player',
    role: 'Application integration layer',
    input: 'HLS, FLV, MPEG-TS, raw H.264/H.265, native media',
    relay: 'Bundled RTSP stream-copy relay',
    bindings: 'Vue, React, Web Component',
    license: 'MIT',
    current: true
  },
  {
    project: 'hls.js',
    href: 'https://github.com/video-dev/hls.js',
    role: 'Specialized HLS engine',
    input: 'HLS over HTTP',
    relay: 'Not in scope',
    bindings: 'Engine API',
    license: 'Apache-2.0'
  },
  {
    project: 'mpegts.js',
    href: 'https://github.com/xqq/mpegts.js',
    role: 'Specialized transmuxing engine',
    input: 'FLV and MPEG-TS over HTTP or WebSocket',
    relay: 'Not in scope',
    bindings: 'Engine API',
    license: 'Apache-2.0'
  },
  {
    project: 'JMuxer',
    href: 'https://github.com/samirkumardas/jmuxer',
    role: 'Elementary-stream MSE feeder',
    input: 'Raw H.264/H.265 and AAC',
    relay: 'Not in scope',
    bindings: 'Library API',
    license: 'MIT'
  },
  {
    project: 'Jessibuca',
    href: 'https://github.com/langhuihui/jessibuca',
    role: 'Surveillance-oriented web player',
    input: 'Broad live-video paths; features vary by edition',
    relay: 'External streaming service required',
    bindings: 'Player API and ecosystem integrations',
    license: 'GPL-3.0 for OSS edition'
  }
]

const relayBenchmarks = [
  {
    viewers: '1 viewer',
    firstMedia: '2.42 s',
    perViewer: '4.31 Mb/s',
    aggregate: '4.31 Mb/s',
    relayCpu: '1.07%',
    relayRss: '54.79 MiB',
    ffmpeg: '0.77% / 25.36 MiB',
    processes: '1',
    dropped: '0'
  },
  {
    viewers: '2 viewers',
    firstMedia: '2.08 s',
    perViewer: '4.32 Mb/s',
    aggregate: '8.64 Mb/s',
    relayCpu: '1.10%',
    relayRss: '55.52 MiB',
    ffmpeg: '0.70% / 25.40 MiB',
    processes: '1',
    dropped: '0'
  }
]

const bundleSizes = [
  { name: 'Playground app JS', minified: '41.9 KB', gzip: '14.6 KB' },
  { name: 'Playground CSS', minified: '15.2 KB', gzip: '3.6 KB' },
  { name: 'Vue and icons', minified: '74.7 KB', gzip: '28.3 KB' },
  { name: 'mpegts.js engine', minified: '264.3 KB', gzip: '62.2 KB' },
  { name: 'hls.js engine', minified: '524.0 KB', gzip: '162.1 KB' }
]

const mount = ref<HTMLElement>()
const player = ref<StreamPlayer>()
const url = ref(presets[0]!.url)
const relayUrl = ref('')
const protocol = ref<StreamProtocol>('hls')
const codec = ref<VideoCodec>('avc')
const fps = ref(25)
const state = ref<PlayerState>('idle')
const adapterName = ref('Not selected')
const muted = ref(true)
const loading = ref(false)
const stats = ref<PlayerStats>({ adapterId: '-', currentTime: 0, bufferedSeconds: 0 })
const capabilities = ref<PlaybackCapabilities>()
const logs = ref<Array<{ time: string; tone: 'normal' | 'error'; message: string }>>([])
const repositoryUrl = import.meta.env.VITE_REPOSITORY_URL?.trim()
  || 'https://github.com/webxiaobaiyu-droid/web-stream-player'
const installCommand = 'pnpm add web-stream-player'
const installCopied = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

const relayVisible = computed(() => protocol.value === 'rtsp')
const stateLabel = computed(() => state.value.replace('-', ' '))
const isPlaying = computed(() => state.value === 'playing')
const bitrateLabel = computed(() => stats.value.bitrate
  ? `${(stats.value.bitrate / 1_000_000).toFixed(2)} Mb/s`
  : '--')
const resolutionLabel = computed(() => stats.value.width && stats.value.height
  ? `${stats.value.width} x ${stats.value.height}`
  : '--')

onMounted(async () => {
  capabilities.value = detectCapabilities()
  if (!mount.value) return
  const instance = createWebStreamPlayer({ target: mount.value, muted: muted.value })
  instance.on('statechange', ({ state: next }) => {
    state.value = next
    appendLog(`State changed to ${next}.`)
  })
  instance.on('adapterchange', ({ adapterName: name }) => {
    adapterName.value = name
    appendLog(`Adapter selected: ${name}.`)
  })
  instance.on('stats', (value) => { stats.value = value })
  instance.on('metadata', (value) => {
    appendLog(`Media identified: ${value.codec ?? 'unknown codec'}${value.width ? `, ${value.width}x${value.height}` : ''}.`)
  })
  instance.on('warning', ({ message }) => appendLog(message))
  instance.on('error', ({ error }) => appendLog(error.message, 'error'))
  player.value = instance
  await load(false)
})

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer)
  void player.value?.destroy()
})

function applyPreset(preset: Preset): void {
  url.value = preset.url
  relayUrl.value = preset.relayUrl ?? ''
  protocol.value = preset.protocol
  codec.value = preset.codec
  appendLog(`Preset loaded: ${preset.name}.`)
}

async function load(playAfterLoad = true): Promise<void> {
  if (!player.value || !url.value.trim()) return
  loading.value = true
  stats.value = { adapterId: '-', currentTime: 0, bufferedSeconds: 0 }
  adapterName.value = 'Selecting adapter'
  try {
    await player.value.load({
      url: url.value.trim(),
      relayUrl: relayUrl.value.trim() || undefined,
      protocol: protocol.value,
      codec: codec.value,
      fps: fps.value,
      isLive: protocol.value !== 'native'
    })
    if (playAfterLoad) await player.value.play()
  } catch {
    // Player events already expose the actionable failure.
  } finally {
    loading.value = false
  }
}

async function togglePlayback(): Promise<void> {
  if (!player.value) return
  if (isPlaying.value) player.value.pause()
  else await player.value.play()
}

function toggleMuted(): void {
  muted.value = !muted.value
  player.value?.setMuted(muted.value)
}

async function enterFullscreen(): Promise<void> {
  await mount.value?.parentElement?.requestFullscreen()
}

function captureFrame(): void {
  if (!mount.value) return
  const sourceCanvas = mount.value.querySelector('canvas')
  const video = mount.value.querySelector('video')
  const output = document.createElement('canvas')
  const width = sourceCanvas?.width || video?.videoWidth || 0
  const height = sourceCanvas?.height || video?.videoHeight || 0
  if (!width || !height) {
    appendLog('No decoded frame is available for capture.', 'error')
    return
  }
  output.width = width
  output.height = height
  output.getContext('2d')?.drawImage(sourceCanvas ?? video!, 0, 0, width, height)
  const anchor = document.createElement('a')
  anchor.download = `web-stream-frame-${Date.now()}.png`
  anchor.href = output.toDataURL('image/png')
  anchor.click()
  appendLog('Current frame saved as PNG.')
}

async function copyInstallCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(installCommand)
    installCopied.value = true
    if (copyResetTimer) clearTimeout(copyResetTimer)
    copyResetTimer = setTimeout(() => { installCopied.value = false }, 1800)
  } catch {
    appendLog('Clipboard access is unavailable. Select the install command manually.', 'error')
  }
}

function appendLog(message: string, tone: 'normal' | 'error' = 'normal'): void {
  logs.value.unshift({
    time: new Date().toLocaleTimeString([], { hour12: false }),
    tone,
    message
  })
  logs.value = logs.value.slice(0, 8)
}
</script>

<template>
  <div class="workbench">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><Radio :size="18" /></span>
        <div>
          <h1>Web Stream Player</h1>
          <span>Protocol workbench</span>
        </div>
      </div>

      <div class="status-line" :data-state="state">
        <span class="status-dot" />
        <span>{{ stateLabel }}</span>
        <span class="status-adapter">{{ adapterName }}</span>
      </div>

      <a
        class="repo-link"
        :href="repositoryUrl"
        target="_blank"
        rel="noreferrer"
      >
        <span>GitHub</span>
        <ExternalLink :size="13" aria-hidden="true" />
      </a>
    </header>

    <main class="workspace">
      <aside class="control-panel" aria-label="Stream input">
        <div class="panel-heading">
          <span>Input</span>
          <Activity :size="16" />
        </div>

        <label class="field field--wide">
          <span>Stream URL</span>
          <input v-model="url" type="url" spellcheck="false" />
        </label>

        <label v-if="relayVisible" class="field field--wide">
          <span>Relay URL</span>
          <input v-model="relayUrl" type="url" spellcheck="false" />
        </label>

        <div class="field-row">
          <label class="field">
            <span>Protocol</span>
            <span class="select-wrap">
              <select v-model="protocol">
                <option value="auto">Auto</option>
                <option value="hls">HLS</option>
                <option value="flv">FLV</option>
                <option value="mpegts">MPEG-TS</option>
                <option value="rtsp">RTSP relay</option>
                <option value="annexb">Raw Annex-B</option>
                <option value="native">Native</option>
              </select>
              <ChevronDown :size="14" />
            </span>
          </label>

          <label class="field">
            <span>Codec</span>
            <span class="select-wrap">
              <select v-model="codec">
                <option value="auto">Auto</option>
                <option value="avc">H.264</option>
                <option value="hevc">H.265</option>
              </select>
              <ChevronDown :size="14" />
            </span>
          </label>
        </div>

        <label v-if="protocol === 'annexb'" class="field field--compact">
          <span>Frame rate</span>
          <input v-model.number="fps" type="number" min="1" max="120" />
        </label>

        <button class="load-button" type="button" :disabled="loading" @click="load(true)">
          <LoaderCircle v-if="loading" class="spin" :size="17" />
          <Play v-else :size="17" fill="currentColor" />
          <span>{{ loading ? 'Opening stream' : 'Open stream' }}</span>
        </button>

        <div class="preset-section">
          <span class="section-label">Presets</span>
          <button
            v-for="preset in presets"
            :key="preset.name"
            type="button"
            class="preset-button"
            @click="applyPreset(preset)"
          >
            <span>{{ preset.name }}</span>
            <span>{{ preset.codec === 'auto' ? 'AUTO' : preset.codec.toUpperCase() }}</span>
          </button>
        </div>

        <div class="capability-section">
          <span class="section-label">Runtime</span>
          <div v-if="capabilities" class="capability-grid">
            <span :data-on="capabilities.mse">MSE</span>
            <span :data-on="capabilities.webCodecs">WebCodecs</span>
            <span :data-on="capabilities.nativeHls">Native HLS</span>
            <span :data-on="capabilities.webGl2">WebGL 2</span>
            <span :data-on="capabilities.wasm">WASM</span>
            <span :data-on="capabilities.webTransport">WebTransport</span>
          </div>
        </div>
      </aside>

      <section class="player-column">
        <div class="stage-shell">
          <div ref="mount" class="player-stage">
            <div v-if="state === 'idle' || state === 'loading'" class="empty-signal">
              <Radio :size="26" />
              <span>{{ state === 'loading' ? 'Negotiating stream' : 'No signal' }}</span>
            </div>
          </div>

          <div class="transport-bar">
            <div class="transport-actions">
              <button type="button" :title="isPlaying ? 'Pause' : 'Play'" @click="togglePlayback">
                <Pause v-if="isPlaying" :size="18" fill="currentColor" />
                <Play v-else :size="18" fill="currentColor" />
              </button>
              <button type="button" :title="muted ? 'Unmute' : 'Mute'" @click="toggleMuted">
                <VolumeX v-if="muted" :size="18" />
                <Volume2 v-else :size="18" />
              </button>
              <button type="button" title="Reload stream" @click="load(true)">
                <RefreshCw :size="17" />
              </button>
            </div>

            <div class="transport-readout">
              <span>{{ protocol.toUpperCase() }}</span>
              <span>{{ codec === 'auto' ? 'AUTO' : codec.toUpperCase() }}</span>
              <span>{{ bitrateLabel }}</span>
            </div>

            <div class="transport-actions transport-actions--end">
              <button type="button" title="Capture frame" @click="captureFrame">
                <Camera :size="17" />
              </button>
              <button type="button" title="Enter fullscreen" @click="enterFullscreen">
                <Expand :size="17" />
              </button>
            </div>
          </div>
        </div>

        <div class="signal-strip" aria-label="Current stream statistics">
          <div>
            <span>Resolution</span>
            <strong>{{ resolutionLabel }}</strong>
          </div>
          <div>
            <span>Frame rate</span>
            <strong>{{ stats.fps ? `${stats.fps.toFixed(1)} fps` : '--' }}</strong>
          </div>
          <div>
            <span>Buffer</span>
            <strong>{{ `${stats.bufferedSeconds.toFixed(2)} s` }}</strong>
          </div>
          <div>
            <span>Decoded</span>
            <strong>{{ stats.decodedFrames ?? '--' }}</strong>
          </div>
          <div>
            <span>Dropped</span>
            <strong :class="{ alert: (stats.droppedFrames ?? 0) > 0 }">{{ stats.droppedFrames ?? '--' }}</strong>
          </div>
        </div>
      </section>

      <aside class="diagnostics-panel" aria-label="Diagnostics">
        <div class="panel-heading">
          <span>Diagnostics</span>
          <span class="record-indicator">Live</span>
        </div>

        <dl class="metrics-list">
          <div><dt>Adapter</dt><dd>{{ adapterName }}</dd></div>
          <div><dt>Protocol</dt><dd>{{ protocol }}</dd></div>
          <div><dt>Codec</dt><dd>{{ codec }}</dd></div>
          <div><dt>Bitrate</dt><dd>{{ bitrateLabel }}</dd></div>
          <div><dt>Playhead</dt><dd>{{ stats.currentTime.toFixed(2) }} s</dd></div>
        </dl>

        <div class="event-log">
          <span class="section-label">Event log</span>
          <ol>
            <li v-for="(entry, index) in logs" :key="`${entry.time}-${index}`" :data-tone="entry.tone">
              <time>{{ entry.time }}</time>
              <span>{{ entry.message }}</span>
            </li>
            <li v-if="!logs.length" class="log-empty">Waiting for player events.</li>
          </ol>
        </div>
      </aside>
    </main>

    <div class="site-content">
      <section class="marketing-section advantage-section" aria-labelledby="advantage-title">
        <div class="section-intro">
          <h2 id="advantage-title">One interface. Protocol-specific engines underneath.</h2>
          <p>
            Web Stream Player coordinates lifecycle, capability checks, diagnostics, and framework bindings.
            Proven engines still handle the protocol work they do best.
          </p>
        </div>

        <div class="proof-grid">
          <article v-for="item in advantages" :key="item.title" class="proof-item">
            <component :is="item.icon" :size="21" stroke-width="1.7" aria-hidden="true" />
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
          </article>
        </div>

        <div class="architecture-line" aria-label="RTSP stream-copy architecture">
          <span>RTSP camera</span>
          <strong>one input</strong>
          <span>FFmpeg -c copy</span>
          <strong>MPEG-TS</strong>
          <span>stream hub</span>
          <strong>WebSocket</strong>
          <span>browser viewers</span>
        </div>
      </section>

      <section class="marketing-section comparison-section" aria-labelledby="comparison-title">
        <div class="section-intro">
          <h2 id="comparison-title">Choose the right layer for the job.</h2>
          <p>
            This project is an integration layer, not a replacement demuxer. A single-protocol product may be better served by a focused engine directly.
          </p>
        </div>

        <div class="table-scroll" tabindex="0" aria-label="Player library comparison">
          <table class="comparison-table">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Primary role</th>
                <th scope="col">Documented input focus</th>
                <th scope="col">RTSP boundary</th>
                <th scope="col">Bindings</th>
                <th scope="col">License</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in comparisons" :key="item.project" :data-current="item.current || undefined">
                <th scope="row">
                  <a :href="item.href" target="_blank" rel="noreferrer">
                    <span>{{ item.project }}</span>
                    <ExternalLink :size="12" aria-hidden="true" />
                  </a>
                </th>
                <td>{{ item.role }}</td>
                <td>{{ item.input }}</td>
                <td>{{ item.relay }}</td>
                <td>{{ item.bindings }}</td>
                <td>{{ item.license }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="comparison-note">
          Compared from public project documentation on 2026-08-09. hls.js and mpegts.js are dependencies in the default stack, not competing reimplementations.
        </p>
      </section>

      <section class="marketing-section benchmark-section" aria-labelledby="benchmark-title">
        <div class="section-intro">
          <h2 id="benchmark-title">Measured, reproducible, and deliberately narrow.</h2>
          <p>
            A synthetic 1080p RTSP source was relayed without video transcoding. The figures below describe one machine and one controlled test.
          </p>
        </div>

        <div class="benchmark-layout">
          <aside class="benchmark-environment" aria-label="Benchmark environment">
            <h3>Test environment</h3>
            <dl>
              <div><dt>Machine</dt><dd>MacBook Air</dd></div>
              <div><dt>Processor</dt><dd>Apple M4, 10 cores</dd></div>
              <div><dt>Memory</dt><dd>32 GB</dd></div>
              <div><dt>System</dt><dd>macOS 26.5.2</dd></div>
              <div><dt>Runtime</dt><dd>Node 18.19.1</dd></div>
              <div><dt>Relay tool</dt><dd>FFmpeg 8.1.2</dd></div>
              <div><dt>Source</dt><dd>H.264, 1920x1080, 25 fps, 4.16 Mb/s</dd></div>
            </dl>
          </aside>

          <div class="benchmark-results">
            <div class="table-scroll" tabindex="0" aria-label="RTSP relay benchmark results">
              <table class="benchmark-table">
                <thead>
                  <tr>
                    <th scope="col">Scenario</th>
                    <th scope="col">First media</th>
                    <th scope="col">Per viewer</th>
                    <th scope="col">Total egress</th>
                    <th scope="col">Relay CPU</th>
                    <th scope="col">Relay RSS</th>
                    <th scope="col">FFmpeg CPU / RSS</th>
                    <th scope="col">FFmpeg processes</th>
                    <th scope="col">Dropped chunks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in relayBenchmarks" :key="item.viewers">
                    <th scope="row">{{ item.viewers }}</th>
                    <td>{{ item.firstMedia }}</td>
                    <td>{{ item.perViewer }}</td>
                    <td>{{ item.aggregate }}</td>
                    <td>{{ item.relayCpu }}</td>
                    <td>{{ item.relayRss }}</td>
                    <td>{{ item.ffmpeg }}</td>
                    <td>{{ item.processes }}</td>
                    <td>{{ item.dropped }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="method-notes">
              <p>Client transfer was sampled for 32 seconds. CPU time and RSS were measured for 30 seconds after the first media bytes arrived.</p>
              <p>CPU is process CPU time divided by wall time. RSS is the average of 30 one-second samples. Network egress scales with viewers.</p>
            </div>
          </div>
        </div>

        <div class="bundle-section">
          <div>
            <h3>Production demo chunks</h3>
            <p>Vite output from the same commit. Engines are split so the browser can cache them independently.</p>
          </div>
          <dl class="bundle-list">
            <div v-for="item in bundleSizes" :key="item.name">
              <dt>{{ item.name }}</dt>
              <dd><strong>{{ item.minified }}</strong><span>{{ item.gzip }} gzip</span></dd>
            </div>
          </dl>
        </div>

        <div class="reproduce-block">
          <span>Reproduce the WebSocket transfer test</span>
          <code>pnpm benchmark:relay -- ws://127.0.0.1:8787/stream/camera 2 32</code>
        </div>
      </section>

      <section class="marketing-section install-section" aria-labelledby="install-title">
        <div>
          <h2 id="install-title">Start with the full stack. Split it later.</h2>
          <p>The default package registers common adapters. Every protocol package can also be installed and composed independently.</p>
        </div>
        <div class="install-actions">
          <div class="install-command">
            <code>{{ installCommand }}</code>
            <button
              type="button"
              :title="installCopied ? 'Copied' : 'Copy install command'"
              :aria-label="installCopied ? 'Install command copied' : 'Copy install command'"
              @click="copyInstallCommand"
            >
              <Check v-if="installCopied" :size="17" aria-hidden="true" />
              <Copy v-else :size="17" aria-hidden="true" />
            </button>
          </div>
          <a :href="`${repositoryUrl}#install`" target="_blank" rel="noreferrer">
            <span>Read setup and relay guide</span>
            <ExternalLink :size="14" aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer class="site-footer">
        <span>Web Stream Player is released under the MIT License.</span>
        <a :href="repositoryUrl" target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </div>
  </div>
</template>
