import type { NormalizedStreamSource, VideoCodec } from '@web-stream-player/core'

export interface ByteTransportHandlers {
  onData(data: Uint8Array): void
  onOpen?(): void
  onClose?(): void
  onError?(error: Error): void
}

export interface ByteTransport {
  readonly id: string
  start(
    source: NormalizedStreamSource,
    handlers: ByteTransportHandlers,
    signal: AbortSignal
  ): Promise<void>
  close(): void
}

export interface EncodedAccessUnit {
  data: Uint8Array
  timestamp: number
  duration: number
  key: boolean
  codec: Exclude<VideoCodec, 'auto'>
}

export interface AccessUnitDemuxer {
  push(data: Uint8Array): EncodedAccessUnit[]
  flush(): EncodedAccessUnit[]
  reset(): void
}

export interface FrameRenderer {
  readonly id: string
  render(frame: VideoFrame): void
  destroy(): void
}

export interface WasmDecodedFrame {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  timestamp: number
}

export interface WasmVideoDecoder {
  configure(config: WasmDecoderConfig): Promise<void> | void
  decode(unit: EncodedAccessUnit): Promise<WasmDecodedFrame[] | void> | WasmDecodedFrame[] | void
  flush?(): Promise<WasmDecodedFrame[] | void> | WasmDecodedFrame[] | void
  close(): Promise<void> | void
}

export interface WasmDecoderConfig {
  codec: Exclude<VideoCodec, 'auto'>
  width?: number
  height?: number
  fps: number
}

export type WasmDecoderFactory = () => Promise<WasmVideoDecoder> | WasmVideoDecoder

