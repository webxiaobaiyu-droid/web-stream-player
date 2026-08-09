import { detectCapabilities } from './capabilities'
import { StreamPlayerError } from './errors'
import { TypedEventEmitter } from './events'
import { AdapterRegistry } from './registry'
import { normalizeSource } from './source'
import { MediaSurface } from './surface'
import type {
  AdapterSession,
  PlayerEventMap,
  PlayerState,
  StreamAdapter,
  StreamPlayerOptions,
  StreamSource
} from './types'

export class StreamPlayer {
  readonly registry: AdapterRegistry
  readonly mount: HTMLElement
  readonly surface: MediaSurface

  private readonly events = new TypedEventEmitter()
  private readonly options: Required<Pick<StreamPlayerOptions, 'autoplay' | 'muted' | 'controls'>>
  private abortController?: AbortController
  private session?: AdapterSession
  private state: PlayerState = 'idle'
  private destroyed = false

  constructor(options: StreamPlayerOptions) {
    this.mount = resolveTarget(options.target)
    this.surface = new MediaSurface(this.mount)
    this.registry = new AdapterRegistry(options.adapters)
    this.options = {
      autoplay: options.autoplay ?? false,
      muted: options.muted ?? true,
      controls: options.controls ?? false
    }
  }

  get currentState(): PlayerState {
    return this.state
  }

  use(adapter: StreamAdapter): this {
    this.assertAlive()
    this.registry.register(adapter)
    return this
  }

  on<K extends keyof PlayerEventMap>(
    type: K,
    listener: (detail: PlayerEventMap[K]) => void
  ): () => void {
    return this.events.on(type, listener)
  }

  once<K extends keyof PlayerEventMap>(
    type: K,
    listener: (detail: PlayerEventMap[K]) => void
  ): () => void {
    return this.events.once(type, listener)
  }

  async load(input: StreamSource): Promise<void> {
    this.assertAlive()
    await this.releaseSession()
    const source = normalizeSource(input)
    const capabilities = detectCapabilities()
    this.abortController = new AbortController()
    this.setState('loading')

    let adapter: StreamAdapter | undefined
    try {
      adapter = await this.registry.select({ source, capabilities })
      this.events.emit('adapterchange', { adapterId: adapter.id, adapterName: adapter.name })
      this.session = await adapter.attach({
        source,
        capabilities,
        mount: this.mount,
        surface: this.surface,
        signal: this.abortController.signal,
        emit: (type, detail) => this.events.emit(type, detail)
      })
      this.session.setMuted?.(this.options.muted)
      this.setState('ready')
      if (this.options.autoplay) await this.play()
    } catch (cause) {
      const error = cause instanceof Error
        ? cause
        : new StreamPlayerError('ADAPTER_ATTACH_FAILED', 'The stream adapter failed to attach.', cause)
      this.setState('error')
      this.events.emit('error', { error, fatal: true, adapterId: adapter?.id })
      throw error
    }
  }

  async play(): Promise<void> {
    this.assertAlive()
    if (!this.session) throw new StreamPlayerError('INVALID_SOURCE', 'Load a stream before playing.')
    await this.session.play()
    this.setState('playing')
  }

  pause(): void {
    this.assertAlive()
    this.session?.pause()
    if (this.session) this.setState('paused')
  }

  seek(time: number): void {
    this.assertAlive()
    this.session?.seek?.(time)
  }

  setMuted(muted: boolean): void {
    this.assertAlive()
    this.options.muted = muted
    this.session?.setMuted?.(muted)
  }

  setVolume(volume: number): void {
    this.assertAlive()
    this.session?.setVolume?.(Math.max(0, Math.min(1, volume)))
  }

  async stop(): Promise<void> {
    this.assertAlive()
    await this.session?.stop?.()
    this.setState('ready')
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return
    await this.releaseSession()
    this.surface.clear()
    this.destroyed = true
    this.setState('destroyed')
    this.events.clear()
  }

  private async releaseSession(): Promise<void> {
    this.abortController?.abort()
    this.abortController = undefined
    const activeSession = this.session
    this.session = undefined
    await activeSession?.destroy()
    this.surface.clear()
  }

  private setState(next: PlayerState): void {
    if (next === this.state) return
    const previous = this.state
    this.state = next
    this.events.emit('statechange', { state: next, previous })
  }

  private assertAlive(): void {
    if (this.destroyed) throw new StreamPlayerError('DESTROYED', 'This player has been destroyed.')
  }
}

function resolveTarget(target: HTMLElement | string): HTMLElement {
  if (typeof target !== 'string') return target
  const element = document.querySelector<HTMLElement>(target)
  if (!element) throw new StreamPlayerError('INVALID_SOURCE', `Player target "${target}" was not found.`)
  return element
}

