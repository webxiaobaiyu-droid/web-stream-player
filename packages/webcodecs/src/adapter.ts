import { supportsWebCodec } from '@web-stream-player/core'
import type {
  AdapterContext,
  AdapterSession,
  StreamAdapter,
  VideoCodec
} from '@web-stream-player/core'
import { AnnexBAccessUnitDemuxer } from './annexb'
import { CanvasFrameRenderer, RgbaFrameRenderer } from './renderer'
import { createByteTransport } from './transport'
import type { EncodedAccessUnit, WasmDecoderFactory } from './types'

export interface AnnexBAdapterOptions {
  wasmDecoderFactory?: WasmDecoderFactory
  maxDecodeQueueSize?: number
}

export function createAnnexBAdapter(options: AnnexBAdapterOptions = {}): StreamAdapter {
  return {
    id: 'annexb-webcodecs',
    name: 'Raw H.264 / H.265',
    probe: async ({ source, capabilities }) => {
      if (source.protocol !== 'annexb' || source.codec === 'auto') return 0
      if (!['http', 'websocket'].includes(source.transport)) return 0
      if (capabilities.webCodecs && await supportsWebCodec(
        source.codec,
        source.width,
        source.height
      )) return 100
      return options.wasmDecoderFactory && capabilities.wasm ? 70 : 0
    },
    attach: (context) => attachAnnexB(context, options)
  }
}

async function attachAnnexB(
  context: AdapterContext,
  options: AnnexBAdapterOptions
): Promise<AdapterSession> {
  if (context.source.codec === 'auto') {
    throw new Error('Raw Annex-B streams require codec: "avc" or codec: "hevc".')
  }
  const codec = context.source.codec
  const fps = context.source.fps ?? 25
  const canvas = context.surface.canvas({
    width: context.source.width,
    height: context.source.height
  })
  const demuxer = new AnnexBAccessUnitDemuxer(codec, fps)
  const transport = createByteTransport(context.source)
  let paused = false
  let receivedBytes = 0
  let decodedFrames = 0
  let droppedFrames = 0
  let awaitingKeyframe = false
  let lastStatsAt = performance.now()
  let lastFrameCount = 0

  const useWebCodecs = context.capabilities.webCodecs && await supportsWebCodec(
    codec,
    context.source.width,
    context.source.height
  )
  const canvasRenderer = useWebCodecs ? new CanvasFrameRenderer(canvas) : undefined
  const rgbaRenderer = !useWebCodecs ? new RgbaFrameRenderer(canvas) : undefined
  const decoder = useWebCodecs
    ? createWebCodecsDecoder(codec, context, canvasRenderer!, () => decodedFrames++)
    : undefined
  const wasmDecoder = !useWebCodecs && options.wasmDecoderFactory
    ? await options.wasmDecoderFactory()
    : undefined

  if (!decoder && !wasmDecoder) {
    throw new Error(`No ${codec.toUpperCase()} decoder is available. Provide a WASM decoder factory.`)
  }
  await wasmDecoder?.configure({
    codec,
    width: context.source.width,
    height: context.source.height,
    fps
  })

  const decode = async (unit: EncodedAccessUnit) => {
    if (paused) return
    if (decoder) {
      if (awaitingKeyframe) {
        if (!unit.key) {
          droppedFrames++
          return
        }
        awaitingKeyframe = false
      }
      if (decoder.decodeQueueSize > (options.maxDecodeQueueSize ?? 8) && !unit.key) {
        awaitingKeyframe = true
        droppedFrames++
        return
      }
      decoder.decode(new EncodedVideoChunk({
        type: unit.key ? 'key' : 'delta',
        timestamp: unit.timestamp,
        duration: unit.duration,
        data: unit.data
      }))
      return
    }
    const frames = await wasmDecoder?.decode(unit)
    for (const frame of frames ?? []) {
      rgbaRenderer?.render(frame)
      decodedFrames++
      context.emit('frame', { timestamp: frame.timestamp, width: frame.width, height: frame.height })
    }
  }

  const statsTimer = window.setInterval(() => {
    const now = performance.now()
    const elapsed = Math.max(1, now - lastStatsAt)
    const frameDelta = decodedFrames - lastFrameCount
    context.emit('stats', {
      adapterId: useWebCodecs ? 'annexb-webcodecs' : 'annexb-wasm',
      currentTime: decodedFrames / fps,
      bufferedSeconds: decoder ? decoder.decodeQueueSize / fps : 0,
      decodedFrames,
      droppedFrames,
      fps: frameDelta * 1000 / elapsed,
      bitrate: receivedBytes * 8 * 1000 / elapsed,
      width: canvas.width,
      height: canvas.height
    })
    receivedBytes = 0
    lastFrameCount = decodedFrames
    lastStatsAt = now
  }, 1000)

  await transport.start(context.source, {
    onData: (data) => {
      receivedBytes += data.byteLength
      for (const unit of demuxer.push(data)) void decode(unit)
    },
    onClose: () => {
      for (const unit of demuxer.flush()) void decode(unit)
    },
    onError: (error) => context.emit('error', {
      error,
      fatal: false,
      adapterId: 'annexb-webcodecs'
    })
  }, context.signal)

  context.emit('metadata', {
    codec,
    width: context.source.width,
    height: context.source.height,
    fps,
    extra: { decoder: useWebCodecs ? 'webcodecs' : 'wasm' }
  })

  return {
    play: async () => { paused = false },
    pause: () => { paused = true },
    stop: () => transport.close(),
    destroy: async () => {
      window.clearInterval(statsTimer)
      transport.close()
      demuxer.reset()
      if (decoder && decoder.state !== 'closed') {
        await decoder.flush().catch(() => undefined)
        decoder.close()
      }
      await wasmDecoder?.close()
      canvasRenderer?.destroy()
      rgbaRenderer?.destroy()
      context.surface.clear()
    }
  }
}

function createWebCodecsDecoder(
  codec: Exclude<VideoCodec, 'auto'>,
  context: AdapterContext,
  renderer: CanvasFrameRenderer,
  onFrame: () => void
): VideoDecoder {
  const decoder = new VideoDecoder({
    output: (frame) => {
      const width = frame.displayWidth || frame.codedWidth
      const height = frame.displayHeight || frame.codedHeight
      const timestamp = frame.timestamp
      renderer.render(frame)
      onFrame()
      context.emit('frame', { timestamp, width, height })
    },
    error: (error) => context.emit('error', {
      error,
      fatal: true,
      adapterId: 'annexb-webcodecs'
    })
  })
  const config: VideoDecoderConfig = {
    codec: codec === 'hevc' ? 'hvc1.1.6.L93.B0' : 'avc1.640028',
    optimizeForLatency: true,
    hardwareAcceleration: 'prefer-hardware'
  }
  if (context.source.width) config.codedWidth = context.source.width
  if (context.source.height) config.codedHeight = context.source.height
  decoder.configure(config)
  return decoder
}
