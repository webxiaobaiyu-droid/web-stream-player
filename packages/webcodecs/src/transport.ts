import type { NormalizedStreamSource } from '@web-stream-player/core'
import type { ByteTransport, ByteTransportHandlers } from './types'

export interface WebSocketTransportOptions {
  reconnect?: boolean
  minReconnectDelay?: number
  maxReconnectDelay?: number
}

export class WebSocketByteTransport implements ByteTransport {
  readonly id = 'websocket'
  private socket?: WebSocket
  private closed = false
  private reconnectAttempt = 0
  private reconnectTimer?: number

  constructor(private readonly options: WebSocketTransportOptions = {}) {}

  async start(
    source: NormalizedStreamSource,
    handlers: ByteTransportHandlers,
    signal: AbortSignal
  ): Promise<void> {
    this.closed = false
    await this.connect(source, handlers, signal)
  }

  close(): void {
    this.closed = true
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.socket?.close(1000, 'player closed')
    this.socket = undefined
  }

  private connect(
    source: NormalizedStreamSource,
    handlers: ByteTransportHandlers,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(source.url)
      this.socket = socket
      socket.binaryType = 'arraybuffer'

      const abort = () => this.close()
      signal.addEventListener('abort', abort, { once: true })

      socket.onopen = () => {
        this.reconnectAttempt = 0
        handlers.onOpen?.()
        resolve()
      }
      socket.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) handlers.onData(new Uint8Array(event.data))
        else if (event.data instanceof Blob) handlers.onData(new Uint8Array(await event.data.arrayBuffer()))
      }
      socket.onerror = () => {
        const error = new Error(`WebSocket stream connection failed: ${source.url}`)
        handlers.onError?.(error)
        if (socket.readyState !== WebSocket.OPEN) reject(error)
      }
      socket.onclose = () => {
        signal.removeEventListener('abort', abort)
        handlers.onClose?.()
        if (!this.closed && !signal.aborted && this.options.reconnect !== false) {
          this.scheduleReconnect(source, handlers, signal)
        }
      }
    })
  }

  private scheduleReconnect(
    source: NormalizedStreamSource,
    handlers: ByteTransportHandlers,
    signal: AbortSignal
  ): void {
    const minimum = this.options.minReconnectDelay ?? 500
    const maximum = this.options.maxReconnectDelay ?? 8000
    const delay = Math.min(maximum, minimum * 2 ** this.reconnectAttempt++)
    this.reconnectTimer = window.setTimeout(() => {
      void this.connect(source, handlers, signal).catch(() => undefined)
    }, delay)
  }
}

export class FetchByteTransport implements ByteTransport {
  readonly id = 'fetch'
  private reader?: ReadableStreamDefaultReader<Uint8Array>

  async start(
    source: NormalizedStreamSource,
    handlers: ByteTransportHandlers,
    signal: AbortSignal
  ): Promise<void> {
    const response = await fetch(source.url, {
      headers: source.headers,
      credentials: source.credentials,
      signal
    })
    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed with HTTP ${response.status}.`)
    }
    handlers.onOpen?.()
    this.reader = response.body.getReader()
    void this.pump(handlers, signal)
  }

  close(): void {
    void this.reader?.cancel()
    this.reader = undefined
  }

  private async pump(handlers: ByteTransportHandlers, signal: AbortSignal): Promise<void> {
    try {
      while (!signal.aborted && this.reader) {
        const { done, value } = await this.reader.read()
        if (done) break
        if (value?.byteLength) handlers.onData(value)
      }
      handlers.onClose?.()
    } catch (cause) {
      if (!signal.aborted) {
        handlers.onError?.(cause instanceof Error ? cause : new Error(String(cause)))
      }
    }
  }
}

export function createByteTransport(source: NormalizedStreamSource): ByteTransport {
  if (source.transport === 'websocket') return new WebSocketByteTransport()
  return new FetchByteTransport()
}

