import type { CanvasElementOptions, MediaElementOptions, MediaSurfaceContract } from './types'

export class MediaSurface implements MediaSurfaceContract {
  readonly mount: HTMLElement
  private activeElement?: HTMLVideoElement | HTMLCanvasElement

  constructor(mount: HTMLElement) {
    this.mount = mount
  }

  video(options: MediaElementOptions = {}): HTMLVideoElement {
    if (this.activeElement instanceof HTMLVideoElement) {
      this.applyVideoOptions(this.activeElement, options)
      return this.activeElement
    }
    this.clear()
    const video = document.createElement('video')
    video.className = 'wsp-media wsp-media--video'
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.display = 'block'
    video.style.objectFit = 'contain'
    this.applyVideoOptions(video, options)
    this.mount.append(video)
    this.activeElement = video
    return video
  }

  canvas(options: CanvasElementOptions = {}): HTMLCanvasElement {
    if (this.activeElement instanceof HTMLCanvasElement) return this.activeElement
    this.clear()
    const canvas = document.createElement('canvas')
    canvas.className = 'wsp-media wsp-media--canvas'
    canvas.width = options.width ?? 1280
    canvas.height = options.height ?? 720
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.objectFit = 'contain'
    this.mount.append(canvas)
    this.activeElement = canvas
    return canvas
  }

  clear(): void {
    if (this.activeElement instanceof HTMLVideoElement) {
      this.activeElement.pause()
      this.activeElement.removeAttribute('src')
      this.activeElement.load()
    }
    this.activeElement?.remove()
    this.activeElement = undefined
  }

  private applyVideoOptions(video: HTMLVideoElement, options: MediaElementOptions): void {
    video.controls = options.controls ?? false
    video.muted = options.muted ?? true
    video.autoplay = options.autoplay ?? false
    video.playsInline = options.playsInline ?? true
  }
}

