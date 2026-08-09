export type PlayerErrorCode =
  | 'INVALID_SOURCE'
  | 'NO_ADAPTER'
  | 'ADAPTER_ATTACH_FAILED'
  | 'UNSUPPORTED_CODEC'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'DESTROYED'

export class StreamPlayerError extends Error {
  readonly code: PlayerErrorCode
  override readonly cause?: unknown

  constructor(code: PlayerErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'StreamPlayerError'
    this.code = code
    this.cause = cause
  }
}
