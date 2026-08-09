import type { VideoCodec } from '@web-stream-player/core'
import type { AccessUnitDemuxer, EncodedAccessUnit } from './types'

type ConcreteCodec = Exclude<VideoCodec, 'auto'>

export class AnnexBAccessUnitDemuxer implements AccessUnitDemuxer {
  private buffer: Uint8Array = new Uint8Array()
  private current: Uint8Array[] = []
  private currentHasVcl = false
  private currentKey = false
  private timestamp = 0
  private readonly frameDuration: number

  constructor(
    private readonly codec: ConcreteCodec,
    fps = 25
  ) {
    this.frameDuration = Math.round(1_000_000 / Math.max(1, fps))
  }

  push(data: Uint8Array): EncodedAccessUnit[] {
    this.buffer = concat(this.buffer, data)
    const { units, remainder } = splitCompleteNalUnits(this.buffer)
    this.buffer = remainder
    return this.consume(units)
  }

  flush(): EncodedAccessUnit[] {
    const units = this.buffer.byteLength ? [this.buffer] : []
    this.buffer = new Uint8Array()
    const output = this.consume(units)
    const final = this.emitCurrent()
    if (final) output.push(final)
    return output
  }

  reset(): void {
    this.buffer = new Uint8Array()
    this.current = []
    this.currentHasVcl = false
    this.currentKey = false
    this.timestamp = 0
  }

  private consume(units: Uint8Array[]): EncodedAccessUnit[] {
    const output: EncodedAccessUnit[] = []
    for (const unit of units) {
      const info = inspectNal(unit, this.codec)
      const boundary = info.isAud ||
        (info.isVcl && info.isFirstSlice && this.currentHasVcl) ||
        (info.startsNextAccessUnit && this.currentHasVcl)
      if (boundary) {
        const current = this.emitCurrent()
        if (current) output.push(current)
      }
      this.current.push(unit)
      this.currentHasVcl ||= info.isVcl
      this.currentKey ||= info.isKey
    }
    return output
  }

  private emitCurrent(): EncodedAccessUnit | undefined {
    if (!this.current.length || !this.currentHasVcl) return undefined
    const data = concatMany(this.current)
    const unit: EncodedAccessUnit = {
      data,
      timestamp: this.timestamp,
      duration: this.frameDuration,
      key: this.currentKey,
      codec: this.codec
    }
    this.timestamp += this.frameDuration
    this.current = []
    this.currentHasVcl = false
    this.currentKey = false
    return unit
  }
}

function inspectNal(data: Uint8Array, codec: ConcreteCodec): {
  isVcl: boolean
  isFirstSlice: boolean
  isKey: boolean
  isAud: boolean
  startsNextAccessUnit: boolean
} {
  const offset = startCodeLength(data)
  if (codec === 'avc') {
    const type = (data[offset] ?? 0) & 0x1f
    const isVcl = type >= 1 && type <= 5
    return {
      isVcl,
      isFirstSlice: isVcl && readFirstMbInSlice(data.subarray(offset + 1)) === 0,
      isKey: type === 5,
      isAud: type === 9,
      startsNextAccessUnit: [6, 7, 8, 9].includes(type)
    }
  }

  const type = ((data[offset] ?? 0) >> 1) & 0x3f
  const isVcl = type <= 31
  const rbsp = removeEmulationPrevention(data.subarray(offset + 2))
  return {
    isVcl,
    isFirstSlice: isVcl && Boolean((rbsp[0] ?? 0) & 0x80),
    isKey: [16, 17, 18, 19, 20, 21].includes(type),
    isAud: type === 35,
    startsNextAccessUnit: [32, 33, 34, 35, 39].includes(type)
  }
}

function splitCompleteNalUnits(data: Uint8Array): { units: Uint8Array[]; remainder: Uint8Array } {
  const starts: number[] = []
  for (let index = 0; index < data.length - 3; index++) {
    if (data[index] !== 0 || data[index + 1] !== 0) continue
    if (data[index + 2] === 1 || (data[index + 2] === 0 && data[index + 3] === 1)) {
      starts.push(index)
      index += data[index + 2] === 1 ? 2 : 3
    }
  }
  if (starts.length < 2) return { units: [], remainder: data }
  const units: Uint8Array[] = []
  for (let index = 0; index < starts.length - 1; index++) {
    units.push(data.slice(starts[index], starts[index + 1]))
  }
  return { units, remainder: data.slice(starts[starts.length - 1]) }
}

function startCodeLength(data: Uint8Array): number {
  return data[2] === 1 ? 3 : 4
}

function readFirstMbInSlice(data: Uint8Array): number {
  const rbsp = removeEmulationPrevention(data)
  let bit = 0
  let leadingZeroBits = 0
  while (bit < rbsp.length * 8 && readBit(rbsp, bit++) === 0) leadingZeroBits++
  let value = (1 << leadingZeroBits) - 1
  for (let index = 0; index < leadingZeroBits; index++) {
    value += readBit(rbsp, bit++) << (leadingZeroBits - index - 1)
  }
  return value
}

function readBit(data: Uint8Array, bit: number): number {
  return ((data[Math.floor(bit / 8)] ?? 0) >> (7 - (bit % 8))) & 1
}

function removeEmulationPrevention(data: Uint8Array): Uint8Array {
  const output: number[] = []
  for (let index = 0; index < data.length; index++) {
    if (
      index >= 2 &&
      data[index] === 3 &&
      data[index - 1] === 0 &&
      data[index - 2] === 0
    ) continue
    output.push(data[index] ?? 0)
  }
  return Uint8Array.from(output)
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (!left.byteLength) return right.slice()
  const output = new Uint8Array(left.byteLength + right.byteLength)
  output.set(left)
  output.set(right, left.byteLength)
  return output
}

function concatMany(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}
