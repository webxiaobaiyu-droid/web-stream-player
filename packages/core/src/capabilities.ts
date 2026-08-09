import type { PlaybackCapabilities } from './types'

export function detectCapabilities(): PlaybackCapabilities {
  const video = typeof document !== 'undefined' ? document.createElement('video') : undefined
  return {
    mse: typeof MediaSource !== 'undefined',
    webCodecs: typeof VideoDecoder !== 'undefined' && typeof EncodedVideoChunk !== 'undefined',
    nativeHls: Boolean(video?.canPlayType('application/vnd.apple.mpegurl')),
    webSocket: typeof WebSocket !== 'undefined',
    webTransport: typeof globalThis !== 'undefined' && 'WebTransport' in globalThis,
    webGl2: Boolean(
      typeof document !== 'undefined' && document.createElement('canvas').getContext('webgl2')
    ),
    wasm: typeof WebAssembly !== 'undefined'
  }
}

export async function supportsWebCodec(codec: 'avc' | 'hevc', width = 1920, height = 1080): Promise<boolean> {
  if (typeof VideoDecoder === 'undefined') return false
  const codecString = codec === 'hevc' ? 'hvc1.1.6.L93.B0' : 'avc1.640028'
  try {
    const result = await VideoDecoder.isConfigSupported({
      codec: codecString,
      codedWidth: width,
      codedHeight: height,
      optimizeForLatency: true
    })
    return result.supported === true
  } catch {
    return false
  }
}

