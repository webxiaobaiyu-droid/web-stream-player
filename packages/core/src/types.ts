export type StreamProtocol =
  | 'auto'
  | 'native'
  | 'hls'
  | 'flv'
  | 'mpegts'
  | 'rtsp'
  | 'annexb'

export type VideoCodec = 'auto' | 'avc' | 'hevc'
export type StreamTransport = 'auto' | 'http' | 'websocket' | 'webtransport'

export type PlayerState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'ended'
  | 'error'
  | 'destroyed'

export interface StreamSource {
  url: string
  protocol?: StreamProtocol
  transport?: StreamTransport
  codec?: VideoCodec
  mimeType?: string
  relayUrl?: string
  streamId?: string
  headers?: Record<string, string>
  credentials?: RequestCredentials
  isLive?: boolean
  fps?: number
  width?: number
  height?: number
  metadata?: Record<string, unknown>
}

export interface NormalizedStreamSource extends StreamSource {
  protocol: StreamProtocol
  transport: StreamTransport
  codec: VideoCodec
  isLive: boolean
}

export interface PlaybackCapabilities {
  mse: boolean
  webCodecs: boolean
  nativeHls: boolean
  webSocket: boolean
  webTransport: boolean
  webGl2: boolean
  wasm: boolean
}

export interface PlayerStats {
  adapterId: string
  currentTime: number
  bufferedSeconds: number
  decodedFrames?: number
  droppedFrames?: number
  fps?: number
  bitrate?: number
  latency?: number
  width?: number
  height?: number
  extra?: Record<string, unknown>
}

export interface StreamMetadata {
  codec?: string
  width?: number
  height?: number
  fps?: number
  audioCodec?: string
  duration?: number
  extra?: Record<string, unknown>
}

export interface AdapterProbeContext {
  source: NormalizedStreamSource
  capabilities: PlaybackCapabilities
}

export interface AdapterContext extends AdapterProbeContext {
  mount: HTMLElement
  surface: MediaSurfaceContract
  signal: AbortSignal
  emit: <K extends keyof PlayerEventMap>(type: K, detail: PlayerEventMap[K]) => void
}

export interface AdapterSession {
  play(): Promise<void>
  pause(): void
  destroy(): Promise<void> | void
  stop?(): Promise<void> | void
  setMuted?(muted: boolean): void
  setVolume?(volume: number): void
  seek?(time: number): void
}

export interface StreamAdapter {
  readonly id: string
  readonly name: string
  probe(context: AdapterProbeContext): number | Promise<number>
  attach(context: AdapterContext): Promise<AdapterSession>
}

export interface MediaSurfaceContract {
  readonly mount: HTMLElement
  video(options?: MediaElementOptions): HTMLVideoElement
  canvas(options?: CanvasElementOptions): HTMLCanvasElement
  clear(): void
}

export interface MediaElementOptions {
  controls?: boolean
  muted?: boolean
  autoplay?: boolean
  playsInline?: boolean
}

export interface CanvasElementOptions {
  width?: number
  height?: number
}

export interface PlayerEventMap {
  statechange: { state: PlayerState; previous: PlayerState }
  adapterchange: { adapterId: string; adapterName: string }
  metadata: StreamMetadata
  stats: PlayerStats
  frame: { timestamp: number; width: number; height: number }
  error: { error: Error; fatal: boolean; adapterId?: string }
  warning: { message: string; code?: string; detail?: unknown }
}

export interface StreamPlayerOptions {
  target: HTMLElement | string
  adapters?: StreamAdapter[]
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
}

