import Hls from 'hls.js'
import type { AdapterContext, AdapterSession, PlayerStats, StreamAdapter } from '@web-stream-player/core'

export interface HlsAdapterOptions {
  lowLatencyMode?: boolean
  backBufferLength?: number
  maxLiveSyncPlaybackRate?: number
}

export function createHlsAdapter(options: HlsAdapterOptions = {}): StreamAdapter {
  return {
    id: 'hls',
    name: 'HLS',
    probe: ({ source, capabilities }) => {
      if (source.protocol !== 'hls') return 0
      if (capabilities.nativeHls) return 100
      return capabilities.mse && Hls.isSupported() ? 90 : 0
    },
    attach: (context) => context.capabilities.nativeHls
      ? attachNativeHls(context)
      : attachHlsJs(context, options)
  }
}

async function attachNativeHls(context: AdapterContext): Promise<AdapterSession> {
  const video = context.surface.video({ muted: true, playsInline: true })
  video.src = context.source.url
  const stopStats = emitVideoStats(video, context, 'hls-native')
  return {
    play: () => video.play(),
    pause: () => video.pause(),
    setMuted: (muted) => { video.muted = muted },
    setVolume: (volume) => { video.volume = volume },
    seek: (time) => { video.currentTime = time },
    destroy: () => {
      stopStats()
      context.surface.clear()
    }
  }
}

async function attachHlsJs(
  context: AdapterContext,
  options: HlsAdapterOptions
): Promise<AdapterSession> {
  const video = context.surface.video({ muted: true, playsInline: true })
  const hls = new Hls({
    lowLatencyMode: options.lowLatencyMode ?? true,
    backBufferLength: options.backBufferLength ?? 30,
    maxLiveSyncPlaybackRate: options.maxLiveSyncPlaybackRate ?? 1.25,
    xhrSetup: (xhr) => {
      if (context.source.credentials === 'include') xhr.withCredentials = true
      for (const [key, value] of Object.entries(context.source.headers ?? {})) {
        xhr.setRequestHeader(key, value)
      }
    }
  })

  hls.on(Hls.Events.ERROR, (_event, data) => {
    const error = new Error(`${data.type}: ${data.details}`)
    context.emit('error', { error, fatal: data.fatal, adapterId: 'hls' })
    if (!data.fatal) return
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
    else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
  })
  hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
    context.emit('metadata', {
      duration: data.details.live ? undefined : data.details.totalduration,
      extra: { live: data.details.live, levelCount: hls.levels.length }
    })
  })
  hls.attachMedia(video)
  hls.loadSource(context.source.url)
  const stopStats = emitVideoStats(video, context, 'hls')

  return {
    play: () => video.play(),
    pause: () => video.pause(),
    setMuted: (muted) => { video.muted = muted },
    setVolume: (volume) => { video.volume = volume },
    seek: (time) => { video.currentTime = time },
    stop: () => hls.stopLoad(),
    destroy: () => {
      stopStats()
      hls.destroy()
      context.surface.clear()
    }
  }
}

function emitVideoStats(
  video: HTMLVideoElement,
  context: AdapterContext,
  adapterId: string
): () => void {
  let lastDecodedFrames = 0
  let lastSampleAt = performance.now()
  const timer = window.setInterval(() => {
    const quality = video.getVideoPlaybackQuality?.()
    const now = performance.now()
    const decodedFrames = quality?.totalVideoFrames
    const elapsed = now - lastSampleAt
    const bufferedEnd = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0
    const stats: PlayerStats = {
      adapterId,
      currentTime: video.currentTime,
      bufferedSeconds: Math.max(0, bufferedEnd - video.currentTime),
      decodedFrames,
      droppedFrames: quality?.droppedVideoFrames,
      fps: decodedFrames !== undefined && elapsed > 0
        ? Math.max(0, decodedFrames - lastDecodedFrames) * 1000 / elapsed
        : undefined,
      width: video.videoWidth || undefined,
      height: video.videoHeight || undefined
    }
    lastDecodedFrames = decodedFrames ?? lastDecodedFrames
    lastSampleAt = now
    context.emit('stats', stats)
  }, 1000)
  return () => window.clearInterval(timer)
}
