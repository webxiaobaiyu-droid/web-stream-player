import type { FrameRenderer, WasmDecodedFrame } from './types'

export class CanvasFrameRenderer implements FrameRenderer {
  readonly id = 'canvas-2d'
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!context) throw new Error('Canvas 2D is not available.')
    this.context = context
  }

  render(frame: VideoFrame): void {
    const width = frame.displayWidth || frame.codedWidth
    const height = frame.displayHeight || frame.codedHeight
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
    this.context.drawImage(frame, 0, 0, width, height)
    frame.close()
  }

  destroy(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}

export class RgbaFrameRenderer {
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas 2D is not available.')
    this.context = context
  }

  render(frame: WasmDecodedFrame): void {
    if (this.canvas.width !== frame.width || this.canvas.height !== frame.height) {
      this.canvas.width = frame.width
      this.canvas.height = frame.height
    }
    // ImageData requires an ArrayBuffer-backed view; WASM memory may be shared.
    const data = new Uint8ClampedArray(frame.data.byteLength)
    data.set(frame.data)
    this.context.putImageData(new ImageData(data, frame.width, frame.height), 0, 0)
  }

  destroy(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
