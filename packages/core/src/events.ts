import type { PlayerEventMap } from './types'

type Listener<K extends keyof PlayerEventMap> = (detail: PlayerEventMap[K]) => void

export class TypedEventEmitter {
  private readonly listeners = new Map<keyof PlayerEventMap, Set<(detail: never) => void>>()

  on<K extends keyof PlayerEventMap>(type: K, listener: Listener<K>): () => void {
    const current = this.listeners.get(type) ?? new Set()
    current.add(listener as (detail: never) => void)
    this.listeners.set(type, current)
    return () => this.off(type, listener)
  }

  once<K extends keyof PlayerEventMap>(type: K, listener: Listener<K>): () => void {
    const unsubscribe = this.on(type, (detail) => {
      unsubscribe()
      listener(detail)
    })
    return unsubscribe
  }

  off<K extends keyof PlayerEventMap>(type: K, listener: Listener<K>): void {
    this.listeners.get(type)?.delete(listener as (detail: never) => void)
  }

  emit<K extends keyof PlayerEventMap>(type: K, detail: PlayerEventMap[K]): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(detail as never)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

