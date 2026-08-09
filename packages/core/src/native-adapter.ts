import type { AdapterContext, AdapterSession, StreamAdapter } from './types'

export function createNativeVideoAdapter(): StreamAdapter {
  return {
    id: 'native-video',
    name: 'Native video element',
    probe: ({ source }) => source.protocol === 'native' ? 50 : 0,
    async attach(context: AdapterContext): Promise<AdapterSession> {
      const video = context.surface.video({ muted: true, playsInline: true })
      video.src = context.source.url
      if (context.source.credentials === 'include') video.crossOrigin = 'use-credentials'
      else if (/^https?:/i.test(context.source.url)) video.crossOrigin = 'anonymous'

      const onLoaded = () => context.emit('metadata', {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : undefined
      })
      const onError = () => context.emit('error', {
        error: new Error(video.error?.message ?? 'The browser could not play this media source.'),
        fatal: true,
        adapterId: 'native-video'
      })
      video.addEventListener('loadedmetadata', onLoaded)
      video.addEventListener('error', onError)

      return {
        play: () => video.play(),
        pause: () => video.pause(),
        seek: (time) => { video.currentTime = time },
        setMuted: (muted) => { video.muted = muted },
        setVolume: (volume) => { video.volume = volume },
        destroy: () => {
          video.removeEventListener('loadedmetadata', onLoaded)
          video.removeEventListener('error', onError)
          context.surface.clear()
        }
      }
    }
  }
}

