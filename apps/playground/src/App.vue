<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Camera,
  ChevronDown,
  Expand,
  ExternalLink,
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
const docsUrl = import.meta.env.BASE_URL.replace(/playground\/?$/, '') || '/'

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

      <nav class="topbar-links" aria-label="Project links">
        <a class="repo-link" :href="docsUrl">
          <BookOpen :size="14" aria-hidden="true" />
          <span>Docs</span>
        </a>
        <a
          class="repo-link"
          :href="repositoryUrl"
          target="_blank"
          rel="noreferrer"
        >
          <span>GitHub</span>
          <ExternalLink :size="13" aria-hidden="true" />
        </a>
      </nav>
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

    <div class="playground-note">
      <BookOpen :size="18" aria-hidden="true" />
      <p>这是可操作的协议工作台。接入说明、Relay 配置和 API 参考请查看文档站。</p>
      <a :href="docsUrl">
        <span>打开文档</span>
        <ArrowRight :size="15" aria-hidden="true" />
      </a>
    </div>
  </div>
</template>
