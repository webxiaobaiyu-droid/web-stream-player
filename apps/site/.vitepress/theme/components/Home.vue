<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleGauge,
  CircleX,
  Copy,
  Github,
  Layers3,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Waypoints
} from 'lucide-vue-next'
import workbenchImage from '../../../../../docs/workbench-desktop.jpg'

const protocolOptions = [
  {
    id: 'hls',
    label: 'HLS',
    summary: '原生 HLS 优先，其余支持 MSE 的浏览器自动使用 hls.js。',
    guide: '/protocols/hls',
    code: `await player.load({
  url: '/live/camera/index.m3u8',
  protocol: 'hls'
})

await player.play()`
  },
  {
    id: 'flv',
    label: 'FLV',
    summary: 'HTTP-FLV 和 WebSocket-FLV 使用同一个 source 契约。',
    guide: '/protocols/flv',
    code: `await player.load({
  url: 'wss://media.example.com/live/camera.flv',
  protocol: 'flv',
  transport: 'websocket'
})`
  },
  {
    id: 'mpegts',
    label: 'MPEG-TS',
    summary: '通过 HTTP 或 WebSocket 输入 TS 字节流，使用 MSE 播放。',
    guide: '/protocols/mpegts',
    code: `await player.load({
  url: 'wss://media.example.com/live/camera.ts',
  protocol: 'mpegts',
  transport: 'websocket'
})`
  },
  {
    id: 'rtsp',
    label: 'RTSP',
    summary: '服务器只做转封装。浏览器连接 WSS，不接触摄像头凭据。',
    guide: '/protocols/rtsp',
    code: `await player.load({
  url: 'rtsp://configured-on-relay/camera-01',
  protocol: 'rtsp',
  relayUrl: 'wss://relay.example.com/stream/camera-01?token=***'
})`
  },
  {
    id: 'annexb',
    label: 'H.264 / H.265',
    summary: '裸 Annex-B 码流使用 WebCodecs，或注入业务自己的 WASM Decoder。',
    guide: '/protocols/annexb',
    code: `await player.load({
  url: 'wss://media.example.com/live/camera.h264',
  protocol: 'annexb',
  transport: 'websocket',
  codec: 'avc',
  fps: 25
})`
  }
] as const

const comparisonRows = [
  {
    name: 'Web Stream Player',
    role: '多协议集成层',
    fit: '需要统一生命周期、框架组件、诊断和 RTSP Relay 的项目',
    current: true
  },
  { name: 'hls.js', role: 'HLS 引擎', fit: '产品只处理 HLS，希望直接使用成熟底层 API' },
  { name: 'mpegts.js', role: 'FLV / TS 引擎', fit: '产品只处理 FLV 或 MPEG-TS' },
  { name: 'JMuxer', role: '裸码流 MSE Feeder', fit: '上游已经提供 H.264/H.265 与 AAC elementary stream' },
  { name: 'Jessibuca', role: '监控播放器生态', fit: '更看重监控业务功能，并能接受对应服务端与许可证约束' }
]

const docGroups = [
  { icon: Radio, title: '协议接入', body: 'HLS、FLV、MPEG-TS、RTSP、裸码流与原生媒体。', href: '/protocols/hls' },
  { icon: Braces, title: '框架组件', body: 'Vue 3、React、Web Component 与纯 TypeScript。', href: '/frameworks/vue' },
  { icon: Server, title: 'Relay 部署', body: 'FFmpeg、Nginx、WSS、Token、健康检查与进程回收。', href: '/deployment/relay' },
  { icon: ShieldCheck, title: '生产安全', body: '摄像头白名单、SSRF 边界、凭据、Origin、ACL 与限流。', href: '/deployment/security' },
  { icon: CircleGauge, title: '性能与容量', body: '真实环境、测量方法、出口带宽与多观看端估算。', href: '/benchmarks' },
  { icon: Layers3, title: 'API 与扩展', body: 'Player、Source、事件、能力检测和自定义 Adapter。', href: '/reference/player' }
]

const activeProtocol = ref<(typeof protocolOptions)[number]['id']>('hls')
const copied = ref(false)
const copyFailed = ref(false)
const sourceCommand = 'git clone https://github.com/webxiaobaiyu-droid/web-stream-player.git'
let copyTimer: ReturnType<typeof setTimeout> | undefined

const selectedProtocol = computed(() => (
  protocolOptions.find((item) => item.id === activeProtocol.value) ?? protocolOptions[0]
))

async function copySourceCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(sourceCommand)
    copied.value = true
    copyFailed.value = false
  } catch {
    copied.value = false
    copyFailed.value = true
  }

  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
    copyFailed.value = false
  }, 1800)
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div class="wsp-home">
    <section class="wsp-hero" aria-labelledby="wsp-hero-title">
      <div class="wsp-hero-copy">
        <span class="wsp-kicker">浏览器视频流基础设施</span>
        <h1 id="wsp-hero-title">一套 API，接住每一路视频流</h1>
        <p>统一接入 HLS、FLV、MPEG-TS、裸码流和经 Relay 转发的 RTSP。</p>
        <div class="wsp-hero-actions">
          <a class="wsp-button wsp-button-primary" :href="withBase('/guide/quick-start')">
            <span>开始接入</span>
            <ArrowRight :size="17" aria-hidden="true" />
          </a>
          <a class="wsp-button wsp-button-secondary" :href="withBase('/playground/')">
            <Play :size="16" fill="currentColor" aria-hidden="true" />
            <span>在线调试</span>
          </a>
        </div>
      </div>

      <figure class="wsp-hero-visual">
        <img
          :src="workbenchImage"
          width="1280"
          height="720"
          alt="Web Stream Player 协议工作台正在播放 HLS 测试流"
        />
        <figcaption>
          <span><Radio :size="14" aria-hidden="true" />实时工作台</span>
          <span>码率、缓冲、帧率、掉帧与事件均可观察</span>
        </figcaption>
      </figure>
    </section>

    <nav class="wsp-protocol-rail" aria-label="支持的输入协议">
      <span>HLS</span>
      <span>HTTP-FLV</span>
      <span>WS-FLV</span>
      <span>MPEG-TS</span>
      <span>RTSP Relay</span>
      <span>H.264</span>
      <span>H.265</span>
      <span>MP4 / WebM</span>
    </nav>

    <section id="protocols" class="wsp-section wsp-protocol-section" aria-labelledby="protocol-title">
      <div class="wsp-section-heading">
        <h2 id="protocol-title">格式不同，生命周期一致</h2>
        <p>加载、播放、暂停、销毁、错误和统计使用同一套 TypeScript API。</p>
      </div>

      <div class="wsp-protocol-explorer">
        <div class="wsp-protocol-tabs" role="tablist" aria-label="协议代码示例">
          <button
            v-for="item in protocolOptions"
            :id="`protocol-tab-${item.id}`"
            :key="item.id"
            type="button"
            role="tab"
            :aria-selected="activeProtocol === item.id"
            :aria-controls="`protocol-panel-${item.id}`"
            @click="activeProtocol = item.id"
          >
            {{ item.label }}
          </button>
        </div>

        <div
          :id="`protocol-panel-${selectedProtocol.id}`"
          class="wsp-code-panel"
          role="tabpanel"
          :aria-labelledby="`protocol-tab-${selectedProtocol.id}`"
        >
          <div class="wsp-code-copy">
            <div>
              <strong>{{ selectedProtocol.label }}</strong>
              <p>{{ selectedProtocol.summary }}</p>
            </div>
            <a :href="withBase(selectedProtocol.guide)">
              查看接入文档
              <ChevronRight :size="15" aria-hidden="true" />
            </a>
          </div>
          <pre><code>{{ selectedProtocol.code }}</code></pre>
        </div>
      </div>
    </section>

    <section class="wsp-section wsp-architecture" aria-labelledby="architecture-title">
      <div class="wsp-section-heading">
        <h2 id="architecture-title">RTSP 的边界在服务器</h2>
        <p>Relay 只做 `-c copy` 转封装。一台摄像头只建立一路 RTSP 输入。</p>
      </div>

      <div class="wsp-flow" aria-label="RTSP Relay 数据链路">
        <div class="wsp-flow-node">
          <Radio :size="23" aria-hidden="true" />
          <strong>RTSP 摄像头</strong>
          <span>服务端白名单</span>
        </div>
        <ChevronRight class="wsp-flow-arrow" :size="25" aria-hidden="true" />
        <div class="wsp-flow-node">
          <Server :size="23" aria-hidden="true" />
          <strong>FFmpeg -c copy</strong>
          <span>不解码，不转码</span>
        </div>
        <ChevronRight class="wsp-flow-arrow" :size="25" aria-hidden="true" />
        <div class="wsp-flow-node wsp-flow-node-accent">
          <Waypoints :size="23" aria-hidden="true" />
          <strong>Stream Hub</strong>
          <span>多个观看端共享输出</span>
        </div>
        <ChevronRight class="wsp-flow-arrow" :size="25" aria-hidden="true" />
        <div class="wsp-flow-node">
          <Layers3 :size="23" aria-hidden="true" />
          <strong>浏览器</strong>
          <span>WSS MPEG-TS + MSE</span>
        </div>
      </div>

      <div class="wsp-boundary-notes">
        <span><Check :size="16" aria-hidden="true" />浏览器不接触摄像头账号密码</span>
        <span><Check :size="16" aria-hidden="true" />后续观看端不新增 FFmpeg 进程</span>
        <span><Check :size="16" aria-hidden="true" />出口带宽仍随观看人数增长</span>
      </div>
    </section>

    <section id="performance" class="wsp-section wsp-performance" aria-labelledby="performance-title">
      <div class="wsp-section-heading">
        <span class="wsp-kicker">可复现实测</span>
        <h2 id="performance-title">先给环境，再给数字</h2>
        <p>Apple M4，1080p H.264，25 fps，4.16 Mb/s，RTSP over TCP。</p>
      </div>

      <div class="wsp-metric-grid">
        <article>
          <strong>1.10%</strong>
          <span>双观看端 Relay CPU</span>
        </article>
        <article>
          <strong>55.52 MiB</strong>
          <span>Relay 平均 RSS</span>
        </article>
        <article>
          <strong>1</strong>
          <span>共享 FFmpeg 进程</span>
        </article>
        <article>
          <strong>0</strong>
          <span>Relay 丢块</span>
        </article>
      </div>

      <div class="wsp-benchmark-row">
        <div>
          <span>1 个观看端</span>
          <strong>2.42 s 首包</strong>
          <small>4.31 Mb/s 总出口</small>
        </div>
        <div>
          <span>2 个观看端</span>
          <strong>2.08 s 首包</strong>
          <small>8.64 Mb/s 总出口</small>
        </div>
        <a :href="withBase('/benchmarks')">
          查看环境、方法与限制
          <ArrowRight :size="16" aria-hidden="true" />
        </a>
      </div>
    </section>

    <section class="wsp-section wsp-comparison" aria-labelledby="comparison-title">
      <div class="wsp-section-heading">
        <h2 id="comparison-title">不是替代底层引擎，而是把链路接完整</h2>
        <p>单协议项目直接使用专用引擎更简单，多协议产品需要统一的上层边界。</p>
      </div>

      <div class="wsp-comparison-table" role="table" aria-label="同类型播放器选择">
        <div class="wsp-comparison-head" role="row">
          <span role="columnheader">项目</span>
          <span role="columnheader">定位</span>
          <span role="columnheader">适合场景</span>
        </div>
        <div
          v-for="item in comparisonRows"
          :key="item.name"
          class="wsp-comparison-row"
          :data-current="item.current || undefined"
          role="row"
        >
          <strong role="cell">{{ item.name }}</strong>
          <span role="cell">{{ item.role }}</span>
          <span role="cell">{{ item.fit }}</span>
        </div>
      </div>

      <a class="wsp-text-link" :href="withBase('/guide/choosing')">
        查看能力、服务端要求和许可证对比
        <ArrowRight :size="16" aria-hidden="true" />
      </a>
    </section>

    <section class="wsp-section wsp-docs" aria-labelledby="docs-title">
      <div class="wsp-docs-lead">
        <BookOpen :size="28" aria-hidden="true" />
        <h2 id="docs-title">从第一条流到生产部署</h2>
        <p>文档按真实接入顺序组织。每一页都包含可复制配置、边界说明和排错路径。</p>
        <a class="wsp-button wsp-button-primary" :href="withBase('/guide/')">
          <span>打开文档</span>
          <ArrowRight :size="17" aria-hidden="true" />
        </a>
      </div>

      <div class="wsp-doc-groups">
        <a v-for="group in docGroups" :key="group.title" :href="withBase(group.href)">
          <component :is="group.icon" :size="20" aria-hidden="true" />
          <strong>{{ group.title }}</strong>
          <span>{{ group.body }}</span>
          <ChevronRight :size="16" aria-hidden="true" />
        </a>
      </div>
    </section>

    <section class="wsp-section wsp-source-cta" aria-labelledby="source-title">
      <div>
        <Github :size="28" aria-hidden="true" />
        <h2 id="source-title">先从源码跑起来</h2>
        <p>仓库、工作台、Relay 和基准脚本全部公开。npm 首次发布状态在安装页单独说明。</p>
      </div>
      <div class="wsp-command">
        <code>{{ sourceCommand }}</code>
        <button
          type="button"
          :title="copied ? '已复制' : copyFailed ? '复制失败，请手动选择命令' : '复制命令'"
          @click="copySourceCommand"
        >
          <Check v-if="copied" :size="17" aria-hidden="true" />
          <CircleX v-else-if="copyFailed" :size="17" aria-hidden="true" />
          <Copy v-else :size="17" aria-hidden="true" />
          <span class="sr-only">{{ copied ? '命令已复制' : copyFailed ? '复制失败，请手动选择命令' : '复制源码命令' }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
