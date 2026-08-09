import { StreamPlayerError } from './errors'
import type { AdapterProbeContext, StreamAdapter } from './types'

export class AdapterRegistry {
  private readonly adapters = new Map<string, StreamAdapter>()

  constructor(adapters: StreamAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter)
  }

  register(adapter: StreamAdapter): this {
    this.adapters.set(adapter.id, adapter)
    return this
  }

  unregister(adapterId: string): boolean {
    return this.adapters.delete(adapterId)
  }

  list(): StreamAdapter[] {
    return [...this.adapters.values()]
  }

  async select(context: AdapterProbeContext): Promise<StreamAdapter> {
    const scored = await Promise.all(
      this.list().map(async (adapter) => ({ adapter, score: await adapter.probe(context) }))
    )
    const selected = scored
      .filter(({ score }) => Number.isFinite(score) && score > 0)
      .sort((a, b) => b.score - a.score)[0]

    if (!selected) {
      throw new StreamPlayerError(
        'NO_ADAPTER',
        `No adapter can play protocol "${context.source.protocol}" from ${context.source.url}.`
      )
    }
    return selected.adapter
  }
}

