import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface RelayStreamConfig {
  url: string
  label?: string
  rtspTransport?: 'tcp' | 'udp'
  includeAudio?: boolean
  ffmpegInputArgs?: string[]
}

export interface RelayConfig {
  host?: string
  port?: number
  ffmpegPath?: string
  accessToken?: string
  idleTimeoutMs?: number
  maxClientBufferBytes?: number
  streams: Record<string, RelayStreamConfig>
}

export interface NormalizedRelayConfig {
  host: string
  port: number
  ffmpegPath: string
  accessToken?: string
  idleTimeoutMs: number
  maxClientBufferBytes: number
  streams: Record<string, RelayStreamConfig>
}

export async function loadRelayConfig(path: string): Promise<NormalizedRelayConfig> {
  const absolutePath = resolve(path)
  const raw = await readFile(absolutePath, 'utf8')
  return normalizeRelayConfig(JSON.parse(raw) as RelayConfig)
}

export function normalizeRelayConfig(config: RelayConfig): NormalizedRelayConfig {
  if (!config.streams || !Object.keys(config.streams).length) {
    throw new Error('Relay configuration must define at least one stream.')
  }
  for (const [streamId, stream] of Object.entries(config.streams)) {
    if (!/^[a-zA-Z0-9_-]+$/.test(streamId)) {
      throw new Error(`Invalid stream id "${streamId}". Use letters, numbers, dashes or underscores.`)
    }
    if (!/^rtsp:\/\//i.test(stream.url)) {
      throw new Error(`Stream "${streamId}" must use an rtsp:// URL.`)
    }
  }
  return {
    host: config.host ?? '0.0.0.0',
    port: config.port ?? 8787,
    ffmpegPath: config.ffmpegPath ?? 'ffmpeg',
    accessToken: config.accessToken,
    idleTimeoutMs: config.idleTimeoutMs ?? 5000,
    maxClientBufferBytes: config.maxClientBufferBytes ?? 4 * 1024 * 1024,
    streams: config.streams
  }
}

