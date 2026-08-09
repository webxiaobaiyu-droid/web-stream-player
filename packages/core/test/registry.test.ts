import { describe, expect, it } from 'vitest'
import { AdapterRegistry } from '../src/registry'
import type { AdapterProbeContext, StreamAdapter } from '../src/types'

const context: AdapterProbeContext = {
  source: {
    url: '/live.flv',
    protocol: 'flv',
    transport: 'http',
    codec: 'avc',
    isLive: true
  },
  capabilities: {
    mse: true,
    webCodecs: true,
    nativeHls: false,
    webSocket: true,
    webTransport: false,
    webGl2: true,
    wasm: true
  }
}

function adapter(id: string, score: number): StreamAdapter {
  return {
    id,
    name: id,
    probe: () => score,
    attach: async () => ({ play: async () => {}, pause: () => {}, destroy: () => {} })
  }
}

describe('AdapterRegistry', () => {
  it('selects the highest scoring compatible adapter', async () => {
    const registry = new AdapterRegistry([adapter('fallback', 10), adapter('preferred', 90)])
    await expect(registry.select(context)).resolves.toMatchObject({ id: 'preferred' })
  })

  it('rejects when no adapter is compatible', async () => {
    const registry = new AdapterRegistry([adapter('unsupported', 0)])
    await expect(registry.select(context)).rejects.toThrow(/No adapter/)
  })
})

