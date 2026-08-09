import { describe, expect, it } from 'vitest'
import { inferCodec, inferProtocol, normalizeSource } from '../src/source'

describe('stream source inference', () => {
  it.each([
    ['https://example.com/live/index.m3u8', 'hls'],
    ['https://example.com/live.flv', 'flv'],
    ['wss://example.com/live?format=mpegts', 'mpegts'],
    ['rtsp://camera/live', 'rtsp'],
    ['https://example.com/live.h265', 'annexb']
  ])('infers %s as %s', (url, expected) => {
    expect(inferProtocol(url)).toBe(expected)
  })

  it('infers codecs from extensions and query hints', () => {
    expect(inferCodec('/stream.h264')).toBe('avc')
    expect(inferCodec('/stream?codec=hevc')).toBe('hevc')
  })

  it('uses the relay transport for RTSP sources', () => {
    const source = normalizeSource({
      url: 'rtsp://camera/live',
      relayUrl: 'wss://relay.example/stream/camera-1'
    })
    expect(source.protocol).toBe('rtsp')
    expect(source.transport).toBe('websocket')
  })
})

