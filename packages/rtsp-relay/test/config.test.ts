import { describe, expect, it } from 'vitest'
import { normalizeRelayConfig } from '../src/config'
import { createFfmpegArgs } from '../src/ffmpeg'

describe('RTSP relay configuration', () => {
  it('rejects arbitrary non-RTSP stream targets', () => {
    expect(() => normalizeRelayConfig({ streams: { unsafe: { url: 'http://127.0.0.1' } } }))
      .toThrow(/rtsp/)
  })

  it('uses stream copy instead of transcoding', () => {
    const args = createFfmpegArgs({ url: 'rtsp://camera/live' })
    expect(args).toContain('copy')
    expect(args).not.toContain('libx264')
    expect(args).not.toContain('libx265')
    expect(args).toContain('mpegts')
  })
})

