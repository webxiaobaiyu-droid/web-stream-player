import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes
} from 'react'
import {
  createWebStreamPlayer,
  type PlayerEventMap,
  type StreamPlayer,
  type StreamSource,
  type WebStreamPlayerOptions
} from 'web-stream-player'

export interface WebStreamPlayerRef {
  player?: StreamPlayer
  play(): Promise<void> | undefined
  pause(): void
  reload(): Promise<void> | undefined
}

export interface WebStreamPlayerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError'> {
  source: StreamSource
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  options?: Partial<WebStreamPlayerOptions>
  onPlayerError?: (event: PlayerEventMap['error']) => void
  onStats?: (event: PlayerEventMap['stats']) => void
  onStateChange?: (event: PlayerEventMap['statechange']) => void
}

export const WebStreamPlayer = forwardRef<WebStreamPlayerRef, WebStreamPlayerProps>(
  function WebStreamPlayerComponent(props, ref) {
    const {
      source,
      autoplay = true,
      muted = true,
      controls = false,
      options,
      onPlayerError,
      onStats,
      onStateChange,
      ...elementProps
    } = props
    const mount = useRef<HTMLDivElement>(null)
    const player = useRef<StreamPlayer | null>(null)

    useEffect(() => {
      if (!mount.current) return
      const instance = createWebStreamPlayer({
        ...options,
        target: mount.current,
        autoplay,
        muted,
        controls
      })
      instance.on('error', (event) => onPlayerError?.(event))
      instance.on('stats', (event) => onStats?.(event))
      instance.on('statechange', (event) => onStateChange?.(event))
      player.current = instance
      return () => {
        if (player.current === instance) player.current = null
        void instance.destroy()
      }
    }, [])

    useEffect(() => {
      if (player.current) void player.current.load(source)
    }, [source])

    useEffect(() => player.current?.setMuted(muted), [muted])

    useImperativeHandle(ref, () => ({
      get player() { return player.current ?? undefined },
      play: () => player.current?.play(),
      pause: () => player.current?.pause(),
      reload: () => player.current?.load(source)
    }), [source])

    return <div {...elementProps} ref={mount} className={`web-stream-player ${elementProps.className ?? ''}`} />
  }
)

export * from 'web-stream-player'
