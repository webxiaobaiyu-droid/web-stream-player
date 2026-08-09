import type { RelayStreamConfig } from './config'

export function createFfmpegArgs(stream: RelayStreamConfig): string[] {
  const args = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-fflags', 'nobuffer',
    '-flags', 'low_delay',
    '-rtsp_transport', stream.rtspTransport ?? 'tcp',
    ...(stream.ffmpegInputArgs ?? []),
    '-i', stream.url,
    '-map', '0:v:0'
  ]

  if (stream.includeAudio) args.push('-map', '0:a?')
  else args.push('-an')

  args.push(
    '-c', 'copy',
    '-f', 'mpegts',
    '-mpegts_flags', '+resend_headers',
    '-muxdelay', '0',
    '-muxpreload', '0',
    'pipe:1'
  )
  return args
}

