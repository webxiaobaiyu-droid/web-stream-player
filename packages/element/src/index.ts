import {
  createWebStreamPlayer,
  type StreamPlayer,
  type StreamProtocol,
  type VideoCodec
} from 'web-stream-player'

export class WebStreamPlayerElement extends HTMLElement {
  static observedAttributes = ['src', 'protocol', 'codec', 'relay-url', 'autoplay', 'muted']

  private player?: StreamPlayer
  private readonly mount: HTMLDivElement

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = ':host{display:block}.mount{width:100%;height:100%;background:#0b0e0d}.mount>*{width:100%;height:100%}'
    this.mount = document.createElement('div')
    this.mount.className = 'mount'
    root.append(style, this.mount)
  }

  connectedCallback(): void {
    this.player = createWebStreamPlayer({
      target: this.mount,
      autoplay: this.hasAttribute('autoplay'),
      muted: !this.hasAttribute('muted') || this.getAttribute('muted') !== 'false'
    })
    this.player.on('statechange', (detail) => this.dispatch('statechange', detail))
    this.player.on('stats', (detail) => this.dispatch('stats', detail))
    this.player.on('error', (detail) => this.dispatch('playererror', detail))
    void this.load()
  }

  disconnectedCallback(): void {
    void this.player?.destroy()
    this.player = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.load()
  }

  async play(): Promise<void> {
    await this.player?.play()
  }

  pause(): void {
    this.player?.pause()
  }

  private async load(): Promise<void> {
    const url = this.getAttribute('src')
    if (!url || !this.player) return
    await this.player.load({
      url,
      protocol: (this.getAttribute('protocol') ?? 'auto') as StreamProtocol,
      codec: (this.getAttribute('codec') ?? 'auto') as VideoCodec,
      relayUrl: this.getAttribute('relay-url') ?? undefined
    })
  }

  private dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }))
  }
}

export function defineWebStreamPlayer(tagName = 'web-stream-player'): void {
  if (!customElements.get(tagName)) customElements.define(tagName, WebStreamPlayerElement)
}

export * from 'web-stream-player'

