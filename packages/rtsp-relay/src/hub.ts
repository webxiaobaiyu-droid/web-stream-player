import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import type { WebSocket } from 'ws'
import type { NormalizedRelayConfig, RelayStreamConfig } from './config'
import { createFfmpegArgs } from './ffmpeg'

export interface HubSnapshot {
  streamId: string
  clients: number
  running: boolean
  bytesSent: number
  droppedChunks: number
  lastError?: string
}

export class StreamHub {
  private readonly clients = new Set<WebSocket>()
  private process?: ChildProcessByStdio<null, Readable, Readable>
  private idleTimer?: NodeJS.Timeout
  private restartTimer?: NodeJS.Timeout
  private stopping = false
  private bytesSent = 0
  private droppedChunks = 0
  private lastError?: string

  constructor(
    readonly streamId: string,
    private readonly stream: RelayStreamConfig,
    private readonly config: NormalizedRelayConfig
  ) {}

  addClient(client: WebSocket): void {
    this.clients.add(client)
    if (this.idleTimer) clearTimeout(this.idleTimer)
    client.once('close', () => this.removeClient(client))
    client.once('error', () => this.removeClient(client))
    this.start()
  }

  removeClient(client: WebSocket): void {
    this.clients.delete(client)
    if (!this.clients.size && !this.idleTimer) {
      this.idleTimer = setTimeout(() => this.stop(), this.config.idleTimeoutMs)
    }
  }

  snapshot(): HubSnapshot {
    return {
      streamId: this.streamId,
      clients: this.clients.size,
      running: Boolean(this.process),
      bytesSent: this.bytesSent,
      droppedChunks: this.droppedChunks,
      lastError: this.lastError
    }
  }

  start(): void {
    if (this.process || this.stopping || !this.clients.size) return
    const child = spawn(this.config.ffmpegPath, createFfmpegArgs(this.stream), {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    this.process = child
    child.stdout.on('data', (chunk: Buffer) => this.broadcast(chunk))
    child.stderr.on('data', (chunk: Buffer) => {
      this.lastError = redactCredentials(chunk.toString().trim()).slice(-1000)
    })
    child.once('error', (error) => {
      this.lastError = error.message
    })
    child.once('exit', () => {
      if (this.process === child) this.process = undefined
      if (!this.stopping && this.clients.size) {
        this.restartTimer = setTimeout(() => this.start(), 1000)
      }
    })
  }

  stop(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    if (this.restartTimer) clearTimeout(this.restartTimer)
    this.idleTimer = undefined
    this.restartTimer = undefined
    this.stopping = true
    const child = this.process
    this.process = undefined
    if (child && !child.killed) {
      child.kill('SIGTERM')
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL') }, 1500).unref()
    }
    this.stopping = false
  }

  destroy(): void {
    this.stop()
    for (const client of this.clients) client.close(1001, 'relay shutting down')
    this.clients.clear()
  }

  private broadcast(chunk: Buffer): void {
    for (const client of this.clients) {
      if (client.readyState !== client.OPEN) continue
      if (client.bufferedAmount > this.config.maxClientBufferBytes) {
        this.droppedChunks++
        continue
      }
      client.send(chunk, { binary: true })
      this.bytesSent += chunk.byteLength
    }
  }
}

function redactCredentials(message: string): string {
  return message.replace(/rtsp:\/\/([^:@/]+):([^@/]+)@/gi, 'rtsp://***:***@')
}
