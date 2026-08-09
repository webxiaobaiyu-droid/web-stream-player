import {
  StreamPlayer,
  createNativeVideoAdapter,
  type StreamAdapter,
  type StreamPlayerOptions
} from '@web-stream-player/core'
import { createHlsAdapter, type HlsAdapterOptions } from '@web-stream-player/hls'
import { createMpegTsAdapter, type MpegTsAdapterOptions } from '@web-stream-player/mpegts'
import {
  createAnnexBAdapter,
  type AnnexBAdapterOptions
} from '@web-stream-player/webcodecs'

export interface DefaultAdapterOptions {
  hls?: HlsAdapterOptions
  mpegts?: MpegTsAdapterOptions
  annexb?: AnnexBAdapterOptions
  additional?: StreamAdapter[]
}

export interface WebStreamPlayerOptions extends StreamPlayerOptions {
  adapterOptions?: DefaultAdapterOptions
}

export function createDefaultAdapters(options: DefaultAdapterOptions = {}): StreamAdapter[] {
  return [
    createHlsAdapter(options.hls),
    createMpegTsAdapter(options.mpegts),
    createAnnexBAdapter(options.annexb),
    createNativeVideoAdapter(),
    ...(options.additional ?? [])
  ]
}

export function createWebStreamPlayer(options: WebStreamPlayerOptions): StreamPlayer {
  return new StreamPlayer({
    ...options,
    adapters: options.adapters ?? createDefaultAdapters(options.adapterOptions)
  })
}

export * from '@web-stream-player/core'
export * from '@web-stream-player/hls'
export * from '@web-stream-player/mpegts'
export * from '@web-stream-player/webcodecs'

