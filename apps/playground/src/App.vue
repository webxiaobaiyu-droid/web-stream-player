<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  CircleCheck,
  Code2,
  Copy,
  Expand,
  ExternalLink,
  Info,
  LoaderCircle,
  Pause,
  Play,
  Radio,
  RefreshCw,
  TriangleAlert,
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
  id: string
  name: string
  description: string
  protocol: StreamProtocol
  codec: VideoCodec
  url: string
  relayUrl?: string
}

type InspectorView = 'code' | 'diagnostics'
type FrameworkId = 'vue' | 'react' | 'element' | 'typescript'
type CopyState = 'idle' | 'copied' | 'failed'

const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const presets: Preset[] = [
  {
    id: 'hls',
    name: 'HLS',
    description: 'm3u8 直播切片',
    protocol: 'hls',
    codec: 'avc',
    url: withBase('samples/live.m3u8')
  },
  {
    id: 'flv',
    name: 'HTTP-FLV',
    description: '持续输出的 FLV',
    protocol: 'flv',
    codec: 'avc',
    url: withBase('samples/sample.flv')
  },
  {
    id: 'mpegts',
    name: 'MPEG-TS',
    description: 'HTTP TS 字节流',
    protocol: 'mpegts',
    codec: 'avc',
    url: withBase('samples/sample.ts')
  },
  {
    id: 'annexb',
    name: '裸 H.264',
    description: 'Annex-B + WebCodecs',
    protocol: 'annexb',
    codec: 'avc',
    url: withBase('samples/sample.h264')
  },
  {
    id: 'rtsp',
    name: 'RTSP Relay',
    description: '服务端转封装示例',
    protocol: 'rtsp',
    codec: 'auto',
    url: 'rtsp://configured-on-relay/workshop-01',
    relayUrl: 'ws://localhost:8787/stream/workshop-01'
  }
]

const frameworks: Array<{ id: FrameworkId; label: string; shortLabel: string }> = [
  { id: 'vue', label: 'Vue 3', shortLabel: 'Vue 3' },
  { id: 'react', label: 'React', shortLabel: 'React' },
  { id: 'element', label: 'Web Component', shortLabel: 'Web' },
  { id: 'typescript', label: 'TypeScript', shortLabel: 'TS' }
]

const protocolLabels: Record<StreamProtocol, string> = {
  auto: '自动识别',
  native: '原生媒体',
  hls: 'HLS',
  flv: 'FLV',
  mpegts: 'MPEG-TS',
  rtsp: 'RTSP Relay',
  annexb: '裸码流'
}

const codecLabels: Record<VideoCodec, string> = {
  auto: '自动识别',
  avc: 'H.264',
  hevc: 'H.265'
}

const stateLabels: Record<PlayerState, string> = {
  idle: '等待连接',
  loading: '正在连接',
  ready: '已就绪',
  playing: '正在播放',
  paused: '已暂停',
  stalled: '正在缓冲',
  ended: '播放结束',
  error: '连接失败',
  destroyed: '已销毁'
}

const mount = ref<HTMLElement>()
const player = ref<StreamPlayer>()
const url = ref(presets[0]!.url)
const relayUrl = ref('')
const protocol = ref<StreamProtocol>('hls')
const codec = ref<VideoCodec>('avc')
const fps = ref(25)
const state = ref<PlayerState>('idle')
const adapterName = ref('尚未选择')
const muted = ref(true)
const loading = ref(false)
const lastError = ref('')
const inspectorView = ref<InspectorView>('code')
const selectedFramework = ref<FrameworkId>('vue')
const copyState = ref<CopyState>('idle')
const stats = ref<PlayerStats>({ adapterId: '-', currentTime: 0, bufferedSeconds: 0 })
const capabilities = ref<PlaybackCapabilities>()
const logs = ref<Array<{ time: string; tone: 'normal' | 'error'; message: string }>>([])
const repositoryUrl = import.meta.env.VITE_REPOSITORY_URL?.trim()
  || 'https://github.com/webxiaobaiyu-droid/web-stream-player'
const docsUrl = import.meta.env.BASE_URL.replace(/playground\/?$/, '') || '/'
let copyTimer: ReturnType<typeof setTimeout> | undefined

const relayVisible = computed(() => protocol.value === 'rtsp')
const isPlaying = computed(() => state.value === 'playing')
const stateLabel = computed(() => stateLabels[state.value])
const protocolLabel = computed(() => protocolLabels[protocol.value])
const codecLabel = computed(() => codecLabels[codec.value])
const bitrateLabel = computed(() => stats.value.bitrate
  ? `${(stats.value.bitrate / 1_000_000).toFixed(2)} Mb/s`
  : '--')
const resolutionLabel = computed(() => stats.value.width && stats.value.height
  ? `${stats.value.width} x ${stats.value.height}`
  : '--')
const loadButtonLabel = computed(() => loading.value ? '正在连接' : '连接并播放')
const selectedPresetId = computed(() => presets.find((preset) => (
  preset.url === url.value
  && preset.protocol === protocol.value
  && (preset.relayUrl ?? '') === relayUrl.value
))?.id)

const sourceEntries = computed<Array<[string, string]>>(() => {
  const entries: Array<[string, string]> = [
    ['url', JSON.stringify(url.value.trim() || 'https://media.example.com/live/index.m3u8')],
    ['protocol', JSON.stringify(protocol.value)]
  ]
  if (relayVisible.value && relayUrl.value.trim()) {
    entries.push(['relayUrl', JSON.stringify(relayUrl.value.trim())])
  }
  if (codec.value !== 'auto') entries.push(['codec', JSON.stringify(codec.value)])
  if (protocol.value === 'annexb') entries.push(['fps', String(fps.value)])
  entries.push(['isLive', String(protocol.value !== 'native')])
  return entries
})

const sourceLiteral = computed(() => `{
${sourceEntries.value.map(([key, value]) => `  ${key}: ${value}`).join(',\n')}
}`)
const vueScriptClose = '</' + 'script>'

const codeSamples = computed<Record<FrameworkId, string>>(() => ({
  vue: `<script setup lang="ts">
import { WebStreamPlayer } from '@web-stream-player/vue'
import type { StreamSource } from 'web-stream-player'

const source: StreamSource = ${sourceLiteral.value}
${vueScriptClose}

<template>
  <WebStreamPlayer
    class="stream-player"
    :source="source"
    autoplay
    muted
    @error="console.error($event.error)"
  />
</template>`,
  react: `import { useMemo } from 'react'
import { WebStreamPlayer } from '@web-stream-player/react'
import type { StreamSource } from 'web-stream-player'

export function StreamPreview() {
  const source = useMemo<StreamSource>(() => (${sourceLiteral.value}), [])

  return (
    <WebStreamPlayer
      className="stream-player"
      source={source}
      autoplay
      muted
      onPlayerError={({ error }) => console.error(error)}
    />
  )
}`,
  element: `import { defineWebStreamPlayer } from '@web-stream-player/element'

defineWebStreamPlayer()

<web-stream-player
  src="${escapeAttribute(url.value.trim())}"
  protocol="${protocol.value}"
${codec.value === 'auto' ? '' : `  codec="${codec.value}"\n`}${relayVisible.value && relayUrl.value.trim() ? `  relay-url="${escapeAttribute(relayUrl.value.trim())}"\n` : ''}  autoplay
  muted
></web-stream-player>`,
  typescript: `import { createWebStreamPlayer } from 'web-stream-player'

const player = createWebStreamPlayer({
  target: '#player',
  muted: true
})

player.on('error', ({ error }) => console.error(error))
player.on('stats', (stats) => console.table(stats))

await player.load(${sourceLiteral.value})
await player.play()`
}))

const activeCode = computed(() => codeSamples.value[selectedFramework.value])
const frameworkDocUrl = computed(() => {
  const path: Record<FrameworkId, string> = {
    vue: 'frameworks/vue',
    react: 'frameworks/react',
    element: 'frameworks/web-component',
    typescript: 'frameworks/core'
  }
  return `${docsUrl}${path[selectedFramework.value]}`
})

onMounted(async () => {
  capabilities.value = detectCapabilities()
  if (!mount.value) return
  const instance = createWebStreamPlayer({ target: mount.value, muted: muted.value })
  instance.on('statechange', ({ state: next }) => {
    state.value = next
    appendLog(`状态切换为${stateLabels[next]}`)
  })
  instance.on('adapterchange', ({ adapterName: name }) => {
    adapterName.value = name
    appendLog(`已选择 ${name} Adapter`)
  })
  instance.on('stats', (value) => { stats.value = value })
  instance.on('metadata', (value) => {
    const resolution = value.width ? `，${value.width}x${value.height}` : ''
    appendLog(`识别到 ${value.codec ?? '未知编码'}${resolution}`)
  })
  instance.on('warning', ({ message }) => appendLog(message))
  instance.on('error', ({ error }) => {
    lastError.value = error.message
    appendLog(error.message, 'error')
  })
  player.value = instance
  await load(true)
})

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
  void player.value?.destroy()
})

async function openPreset(preset: Preset): Promise<void> {
  url.value = preset.url
  relayUrl.value = preset.relayUrl ?? ''
  protocol.value = preset.protocol
  codec.value = preset.codec
  appendLog(`打开示例：${preset.name}`)
  await load(true)
}

async function load(playAfterLoad = true): Promise<void> {
  const validationError = validateSource()
  if (validationError) {
    lastError.value = validationError
    appendLog(validationError, 'error')
    return
  }
  if (!player.value) return

  loading.value = true
  lastError.value = ''
  stats.value = { adapterId: '-', currentTime: 0, bufferedSeconds: 0 }
  adapterName.value = '正在选择'
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
  } catch (error) {
    if (!lastError.value) {
      lastError.value = error instanceof Error ? error.message : '视频流连接失败，请检查地址和协议。'
    }
  } finally {
    loading.value = false
  }
}

function validateSource(): string | undefined {
  if (!url.value.trim()) return '请先填写视频流地址。'
  if (relayVisible.value && !relayUrl.value.trim()) return 'RTSP 需要填写 Relay 的 WebSocket 地址。'
  if (protocol.value === 'annexb' && codec.value === 'auto') return '裸码流需要明确选择 H.264 或 H.265。'
  return undefined
}

async function togglePlayback(): Promise<void> {
  if (!player.value) return
  try {
    if (isPlaying.value) player.value.pause()
    else await player.value.play()
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : '播放操作失败。'
  }
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
    lastError.value = '当前还没有可保存的视频帧。'
    appendLog(lastError.value, 'error')
    return
  }
  output.width = width
  output.height = height
  output.getContext('2d')?.drawImage(sourceCanvas ?? video!, 0, 0, width, height)
  const anchor = document.createElement('a')
  anchor.download = `web-stream-frame-${Date.now()}.png`
  anchor.href = output.toDataURL('image/png')
  anchor.click()
  appendLog('当前画面已保存为 PNG')
}

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(activeCode.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copyState.value = 'idle' }, 1800)
}

function appendLog(message: string, tone: 'normal' | 'error' = 'normal'): void {
  logs.value.unshift({
    time: new Date().toLocaleTimeString([], { hour12: false }),
    tone,
    message
  })
  logs.value = logs.value.slice(0, 12)
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
</script>

<template>
  <div class="workbench">
    <header class="topbar">
      <a class="brand" :href="docsUrl" aria-label="返回 Web Stream Player 官网">
        <span class="brand-mark"><Radio :size="18" aria-hidden="true" /></span>
        <span class="brand-copy">
          <strong>Web Stream Player</strong>
          <small>多协议调试工作台</small>
        </span>
      </a>

      <div class="status-line" :data-state="state" aria-live="polite">
        <span class="status-dot" aria-hidden="true" />
        <strong>{{ stateLabel }}</strong>
        <span class="status-adapter">{{ adapterName }}</span>
      </div>

      <nav class="topbar-links" aria-label="项目链接">
        <a class="topbar-link" :href="docsUrl">
          <BookOpen :size="15" aria-hidden="true" />
          <span>文档</span>
        </a>
        <a class="topbar-link" :href="repositoryUrl" target="_blank" rel="noreferrer">
          <span>GitHub</span>
          <ExternalLink :size="13" aria-hidden="true" />
        </a>
      </nav>
    </header>

    <main class="workspace">
      <aside class="control-panel" aria-label="视频流设置">
        <div class="panel-heading">
          <div>
            <strong>视频流</strong>
            <span>输入地址或选择示例</span>
          </div>
          <Activity :size="17" aria-hidden="true" />
        </div>

        <label class="field field-wide">
          <span>流地址</span>
          <input v-model="url" type="url" spellcheck="false" placeholder="https://... 或 wss://..." />
          <small>支持 HTTP(S)、WebSocket，以及服务端配置的 RTSP 描述地址。</small>
        </label>

        <label v-if="relayVisible" class="field field-wide">
          <span>Relay 地址</span>
          <input v-model="relayUrl" type="url" spellcheck="false" placeholder="wss://relay.example.com/stream/..." />
          <small>浏览器连接 WSS Relay，不会直接连接摄像头。</small>
        </label>

        <div class="field-row">
          <label class="field">
            <span>协议</span>
            <span class="select-wrap">
              <select v-model="protocol">
                <option value="auto">自动识别</option>
                <option value="hls">HLS</option>
                <option value="flv">FLV</option>
                <option value="mpegts">MPEG-TS</option>
                <option value="rtsp">RTSP Relay</option>
                <option value="annexb">裸 Annex-B</option>
                <option value="native">MP4 / WebM</option>
              </select>
              <ChevronDown :size="14" aria-hidden="true" />
            </span>
          </label>

          <label class="field">
            <span>视频编码</span>
            <span class="select-wrap">
              <select v-model="codec">
                <option value="auto">自动识别</option>
                <option value="avc">H.264</option>
                <option value="hevc">H.265</option>
              </select>
              <ChevronDown :size="14" aria-hidden="true" />
            </span>
          </label>
        </div>

        <label v-if="protocol === 'annexb'" class="field field-compact">
          <span>帧率</span>
          <input v-model.number="fps" type="number" min="1" max="120" />
        </label>

        <button class="load-button" type="button" :disabled="loading" @click="load(true)">
          <LoaderCircle v-if="loading" class="spin" :size="17" aria-hidden="true" />
          <Play v-else :size="17" fill="currentColor" aria-hidden="true" />
          <span>{{ loadButtonLabel }}</span>
        </button>

        <div v-if="lastError" class="connection-feedback" data-tone="error" role="alert">
          <TriangleAlert :size="17" aria-hidden="true" />
          <span>{{ lastError }}</span>
        </div>
        <div v-else class="connection-feedback" :data-tone="state === 'playing' ? 'success' : 'info'">
          <CircleCheck v-if="state === 'playing'" :size="17" aria-hidden="true" />
          <Info v-else :size="17" aria-hidden="true" />
          <span>{{ state === 'playing' ? `${protocolLabel} 正在播放，右侧代码已同步。` : '点击任一示例可直接播放。' }}</span>
        </div>

        <section class="preset-section" aria-labelledby="preset-title">
          <div class="section-heading-inline">
            <strong id="preset-title">示例流</strong>
            <span>点击即播放</span>
          </div>
          <div class="preset-list">
            <button
              v-for="preset in presets"
              :key="preset.id"
              type="button"
              class="preset-button"
              :data-active="selectedPresetId === preset.id || undefined"
              :disabled="loading"
              @click="openPreset(preset)"
            >
              <span>
                <strong>{{ preset.name }}</strong>
                <small>{{ preset.description }}</small>
              </span>
              <Play :size="14" fill="currentColor" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section class="capability-section" aria-labelledby="capability-title">
          <div class="section-heading-inline">
            <strong id="capability-title">当前浏览器</strong>
            <span>能力检测</span>
          </div>
          <div v-if="capabilities" class="capability-grid">
            <span :data-on="capabilities.mse">MSE</span>
            <span :data-on="capabilities.webCodecs">WebCodecs</span>
            <span :data-on="capabilities.nativeHls">Native HLS</span>
            <span :data-on="capabilities.webGl2">WebGL 2</span>
            <span :data-on="capabilities.wasm">WASM</span>
            <span :data-on="capabilities.webTransport">WebTransport</span>
          </div>
        </section>
      </aside>

      <section class="player-column" aria-labelledby="preview-title">
        <div class="preview-heading">
          <div>
            <strong id="preview-title">播放预览</strong>
            <span>{{ protocolLabel }} / {{ codecLabel }}</span>
          </div>
          <span class="preview-source" :title="url">{{ url }}</span>
        </div>

        <div class="stage-shell">
          <div ref="mount" class="player-stage">
            <div v-if="state === 'idle' || state === 'loading' || state === 'error'" class="empty-signal">
              <LoaderCircle v-if="state === 'loading'" class="spin" :size="27" aria-hidden="true" />
              <TriangleAlert v-else-if="state === 'error'" :size="27" aria-hidden="true" />
              <Radio v-else :size="27" aria-hidden="true" />
              <strong>{{ stateLabel }}</strong>
              <span>{{ state === 'loading' ? '正在请求数据并选择播放 Adapter' : state === 'error' ? '检查左侧地址、协议和跨域配置' : '选择示例或填写视频流地址' }}</span>
            </div>
          </div>

          <div class="transport-bar">
            <div class="transport-actions">
              <button type="button" :title="isPlaying ? '暂停' : '播放'" @click="togglePlayback">
                <Pause v-if="isPlaying" :size="18" fill="currentColor" aria-hidden="true" />
                <Play v-else :size="18" fill="currentColor" aria-hidden="true" />
              </button>
              <button type="button" :title="muted ? '打开声音' : '静音'" @click="toggleMuted">
                <VolumeX v-if="muted" :size="18" aria-hidden="true" />
                <Volume2 v-else :size="18" aria-hidden="true" />
              </button>
              <button type="button" title="重新连接" @click="load(true)">
                <RefreshCw :size="17" aria-hidden="true" />
              </button>
            </div>

            <div class="transport-readout">
              <span>{{ protocolLabel }}</span>
              <span>{{ codecLabel }}</span>
              <span>{{ bitrateLabel }}</span>
            </div>

            <div class="transport-actions transport-actions-end">
              <button type="button" title="保存当前画面" @click="captureFrame">
                <Camera :size="17" aria-hidden="true" />
              </button>
              <button type="button" title="进入全屏" @click="enterFullscreen">
                <Expand :size="17" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div class="signal-strip" aria-label="当前视频流统计">
          <div><span>分辨率</span><strong>{{ resolutionLabel }}</strong></div>
          <div><span>帧率</span><strong>{{ stats.fps ? `${stats.fps.toFixed(1)} fps` : '--' }}</strong></div>
          <div><span>缓冲</span><strong>{{ `${stats.bufferedSeconds.toFixed(2)} s` }}</strong></div>
          <div><span>已解码</span><strong>{{ stats.decodedFrames ?? '--' }}</strong></div>
          <div><span>掉帧</span><strong :class="{ alert: (stats.droppedFrames ?? 0) > 0 }">{{ stats.droppedFrames ?? '--' }}</strong></div>
        </div>
      </section>

      <aside class="inspector-panel" aria-label="接入代码和运行详情">
        <div class="inspector-tabs" role="tablist" aria-label="右侧面板">
          <button
            type="button"
            role="tab"
            :aria-selected="inspectorView === 'code'"
            @click="inspectorView = 'code'"
          >
            <Code2 :size="15" aria-hidden="true" />
            接入代码
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="inspectorView === 'diagnostics'"
            @click="inspectorView = 'diagnostics'"
          >
            <Activity :size="15" aria-hidden="true" />
            运行详情
          </button>
        </div>

        <div v-if="inspectorView === 'code'" class="code-view" role="tabpanel">
          <div class="inspector-heading">
            <div>
              <strong>当前配置的接入代码</strong>
              <span>修改左侧参数后自动更新</span>
            </div>
            <button
              class="icon-button"
              type="button"
              :title="copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制代码'"
              @click="copyCode"
            >
              <Check v-if="copyState === 'copied'" :size="16" aria-hidden="true" />
              <TriangleAlert v-else-if="copyState === 'failed'" :size="16" aria-hidden="true" />
              <Copy v-else :size="16" aria-hidden="true" />
              <span class="sr-only">{{ copyState === 'copied' ? '代码已复制' : '复制接入代码' }}</span>
            </button>
          </div>

          <div class="framework-tabs" role="tablist" aria-label="框架代码">
            <button
              v-for="framework in frameworks"
              :key="framework.id"
              type="button"
              role="tab"
              :aria-selected="selectedFramework === framework.id"
              :title="framework.label"
              @click="selectedFramework = framework.id"
            >
              <span class="framework-label-full">{{ framework.label }}</span>
              <span class="framework-label-short">{{ framework.shortLabel }}</span>
            </button>
          </div>

          <pre class="code-block"><code>{{ activeCode }}</code></pre>

          <a class="inspector-doc-link" :href="frameworkDocUrl">
            查看 {{ frameworks.find((item) => item.id === selectedFramework)?.label }} 完整文档
            <ArrowRight :size="15" aria-hidden="true" />
          </a>
        </div>

        <div v-else class="diagnostics-view" role="tabpanel">
          <div class="inspector-heading">
            <div>
              <strong>播放器运行详情</strong>
              <span>用于定位协议、解码和网络问题</span>
            </div>
            <span class="live-indicator" :data-active="state === 'playing' || undefined">{{ stateLabel }}</span>
          </div>

          <dl class="metrics-list">
            <div><dt>Adapter</dt><dd>{{ adapterName }}</dd></div>
            <div><dt>协议</dt><dd>{{ protocolLabel }}</dd></div>
            <div><dt>编码</dt><dd>{{ codecLabel }}</dd></div>
            <div><dt>码率</dt><dd>{{ bitrateLabel }}</dd></div>
            <div><dt>播放位置</dt><dd>{{ stats.currentTime.toFixed(2) }} s</dd></div>
            <div><dt>缓冲时长</dt><dd>{{ stats.bufferedSeconds.toFixed(2) }} s</dd></div>
          </dl>

          <div class="event-log">
            <div class="section-heading-inline">
              <strong>事件日志</strong>
              <span>最近 {{ logs.length }} 条</span>
            </div>
            <ol>
              <li v-for="(entry, index) in logs" :key="`${entry.time}-${index}`" :data-tone="entry.tone">
                <time>{{ entry.time }}</time>
                <span>{{ entry.message }}</span>
              </li>
              <li v-if="!logs.length" class="log-empty">等待播放器事件。</li>
            </ol>
          </div>
        </div>
      </aside>
    </main>

    <footer class="playground-footer">
      <span>浏览器不能直接连接标准 RTSP，生产环境需要部署 Relay。</span>
      <a :href="`${docsUrl}deployment/relay`">
        查看 Relay 部署文档
        <ArrowRight :size="15" aria-hidden="true" />
      </a>
    </footer>
  </div>
</template>
