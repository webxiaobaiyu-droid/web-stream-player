import mpegts from 'mpegts.js'
import type { AdapterContext, AdapterSession, StreamAdapter } from '@web-stream-player/core'

export interface MpegTsAdapterOptions {
  enableWorker?: boolean
  lazyLoad?: boolean
  liveBufferLatencyChasing?: boolean
  liveBufferLatencyMaxLatency?: number
  liveBufferLatencyMinRemain?: number
}

export function createMpegTsAdapter(options: MpegTsAdapterOptions = {}): StreamAdapter {
  return {
    id: 'mpegts',
    name: 'FLV / MPEG-TS',
    probe: ({ source, capabilities }) => {
      if (!['flv', 'mpegts', 'rtsp'].includes(source.protocol)) return 0
      if (!capabilities.mse || !mpegts.isSupported()) return 0
      return source.protocol === 'rtsp' && !source.relayUrl ? 0 : 95
    },
    attach: (context) => attachMpegTs(context, options)
  }
}

async function attachMpegTs(
  context: AdapterContext,
  options: MpegTsAdapterOptions
): Promise<AdapterSession> {
  const video = context.surface.video({ muted: true, playsInline: true })
  const url = context.source.protocol === 'rtsp'
    ? context.source.relayUrl
    : context.source.url

  if (!url) throw new Error('RTSP playback requires a relayUrl that emits MPEG-TS over WebSocket.')

  const player = mpegts.createPlayer({
    type: context.source.protocol === 'flv' ? 'flv' : 'mpegts',
    isLive: context.source.isLive,
    url,
    cors: true,
    withCredentials: context.source.credentials === 'include'
  }, {
    enableWorker: options.enableWorker ?? false,
    lazyLoad: options.lazyLoad ?? false,
    liveBufferLatencyChasing: options.liveBufferLatencyChasing ?? true,
    liveBufferLatencyMaxLatency: options.liveBufferLatencyMaxLatency ?? 1.5,
    liveBufferLatencyMinRemain: options.liveBufferLatencyMinRemain ?? 0.3
  })
  let speedKilobytesPerSecond: number | undefined
  let lastDecodedFrames = 0
  let lastSampleAt = performance.now()

  player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
    context.emit('error', {
      error: new Error(`${errorType}: ${errorDetail}`),
      fatal: true,
      adapterId: 'mpegts'
    })
    context.emit('warning', { message: errorDetail, code: errorType, detail: errorInfo })
  })
  player.on(mpegts.Events.MEDIA_INFO, (info) => {
    context.emit('metadata', {
      codec: info.videoCodec,
      width: info.width,
      height: info.height,
      fps: info.fps,
      audioCodec: info.audioCodec,
      extra: { mimeType: info.mimeType }
    })
  })
  player.on(mpegts.Events.STATISTICS_INFO, (stats) => {
    speedKilobytesPerSecond = stats.speed
  })

  const statsTimer = window.setInterval(() => {
    const quality = video.getVideoPlaybackQuality?.()
    const decodedFrames = quality?.totalVideoFrames
    const now = performance.now()
    const elapsed = now - lastSampleAt
    const bufferedEnd = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0
    context.emit('stats', {
      adapterId: 'mpegts',
      currentTime: video.currentTime,
      bufferedSeconds: Math.max(0, bufferedEnd - video.currentTime),
      decodedFrames,
      droppedFrames: quality?.droppedVideoFrames,
      fps: decodedFrames !== undefined && elapsed > 0
        ? Math.max(0, decodedFrames - lastDecodedFrames) * 1000 / elapsed
        : undefined,
      bitrate: speedKilobytesPerSecond
        ? speedKilobytesPerSecond * 1024 * 8
        : undefined,
      width: video.videoWidth || undefined,
      height: video.videoHeight || undefined
    })
    lastDecodedFrames = decodedFrames ?? lastDecodedFrames
    lastSampleAt = now
  }, 1000)

  player.attachMediaElement(video)
  player.load()

  return {
    play: async () => { await player.play() },
    pause: () => player.pause(),
    setMuted: (muted) => { video.muted = muted },
    setVolume: (volume) => { video.volume = volume },
    seek: (time) => { video.currentTime = time },
    stop: () => player.unload(),
    destroy: () => {
      window.clearInterval(statsTimer)
      player.pause()
      player.unload()
      player.detachMediaElement()
      player.destroy()
      context.surface.clear()
    }
  }
}
