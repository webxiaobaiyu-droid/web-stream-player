import { StreamPlayerError } from './errors'
import type {
  NormalizedStreamSource,
  StreamProtocol,
  StreamSource,
  StreamTransport,
  VideoCodec
} from './types'

const protocolAliases: Record<string, StreamProtocol> = {
  hls: 'hls',
  m3u8: 'hls',
  flv: 'flv',
  ts: 'mpegts',
  mpegts: 'mpegts',
  rtsp: 'rtsp',
  h264: 'annexb',
  h265: 'annexb',
  hevc: 'annexb',
  annexb: 'annexb'
}

export function inferProtocol(url: string): StreamProtocol {
  if (!url.trim()) {
    throw new StreamPlayerError('INVALID_SOURCE', 'A stream URL is required.')
  }

  if (/^rtsp:\/\//i.test(url)) return 'rtsp'

  try {
    const parsed = new URL(url, globalThis.location?.href ?? 'http://localhost')
    const hintedFormat = parsed.searchParams.get('format')?.toLowerCase()
    if (hintedFormat && protocolAliases[hintedFormat]) return protocolAliases[hintedFormat]

    const pathname = parsed.pathname.toLowerCase()
    if (pathname.endsWith('.m3u8')) return 'hls'
    if (pathname.endsWith('.flv')) return 'flv'
    if (pathname.endsWith('.ts') || pathname.endsWith('.m2ts')) return 'mpegts'
    if (pathname.endsWith('.h264') || pathname.endsWith('.264')) return 'annexb'
    if (pathname.endsWith('.h265') || pathname.endsWith('.hevc') || pathname.endsWith('.265')) {
      return 'annexb'
    }
    if (/^(ws|wss):$/.test(parsed.protocol)) return 'auto'
    if (/^(blob|data):$/.test(parsed.protocol)) return 'native'
  } catch {
    // Relative and custom URLs are resolved by their explicit adapter.
  }

  return 'native'
}

export function inferTransport(url: string): StreamTransport {
  if (/^wss?:\/\//i.test(url)) return 'websocket'
  if (/^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('.')) return 'http'
  return 'auto'
}

export function inferCodec(url: string): VideoCodec {
  const normalized = url.toLowerCase()
  if (/\.(h265|hevc|265)(?:$|\?)/.test(normalized)) return 'hevc'
  if (/\.(h264|264)(?:$|\?)/.test(normalized)) return 'avc'

  try {
    const codec = new URL(url, globalThis.location?.href ?? 'http://localhost').searchParams
      .get('codec')
      ?.toLowerCase()
    if (codec === 'h265' || codec === 'hevc' || codec === 'hvc1' || codec === 'hev1') return 'hevc'
    if (codec === 'h264' || codec === 'avc' || codec === 'avc1') return 'avc'
  } catch {
    // Leave the codec to adapter-level probing.
  }
  return 'auto'
}

export function normalizeSource(source: StreamSource): NormalizedStreamSource {
  const protocol = source.protocol && source.protocol !== 'auto'
    ? source.protocol
    : inferProtocol(source.url)
  const effectiveUrl = protocol === 'rtsp' && source.relayUrl ? source.relayUrl : source.url

  return {
    ...source,
    protocol,
    transport: source.transport && source.transport !== 'auto'
      ? source.transport
      : inferTransport(effectiveUrl),
    codec: source.codec && source.codec !== 'auto' ? source.codec : inferCodec(source.url),
    isLive: source.isLive ?? !['native'].includes(protocol)
  }
}

