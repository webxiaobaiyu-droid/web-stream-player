import { describe, expect, it } from 'vitest'
import { AnnexBAccessUnitDemuxer } from '../src/annexb'

const start = [0, 0, 0, 1]

describe('AnnexBAccessUnitDemuxer', () => {
  it('groups AVC NAL units into access units', () => {
    const demuxer = new AnnexBAccessUnitDemuxer('avc', 25)
    const bytes = Uint8Array.from([
      ...start, 0x09, 0xf0,
      ...start, 0x67, 0x64, 0x00, 0x28,
      ...start, 0x68, 0xee, 0x3c, 0x80,
      ...start, 0x65, 0x80,
      ...start, 0x09, 0xf0,
      ...start, 0x41, 0x80
    ])
    const output = [...demuxer.push(bytes), ...demuxer.flush()]
    expect(output).toHaveLength(2)
    expect(output[0]).toMatchObject({ key: true, timestamp: 0, duration: 40_000 })
    expect(output[1]).toMatchObject({ key: false, timestamp: 40_000 })
  })

  it('recognizes HEVC IDR access units', () => {
    const demuxer = new AnnexBAccessUnitDemuxer('hevc', 30)
    const bytes = Uint8Array.from([
      ...start, 35 << 1, 1, 0x50,
      ...start, 19 << 1, 1, 0x80,
      ...start, 35 << 1, 1, 0x50,
      ...start, 1 << 1, 1, 0x80
    ])
    const output = [...demuxer.push(bytes), ...demuxer.flush()]
    expect(output).toHaveLength(2)
    expect(output[0]?.key).toBe(true)
    expect(output[1]?.key).toBe(false)
  })
})

