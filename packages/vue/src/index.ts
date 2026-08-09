import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType
} from 'vue'
import {
  createWebStreamPlayer,
  type PlayerState,
  type StreamPlayer,
  type StreamSource,
  type WebStreamPlayerOptions
} from 'web-stream-player'

export const WebStreamPlayer = defineComponent({
  name: 'WebStreamPlayer',
  props: {
    source: { type: Object as PropType<StreamSource>, required: true },
    autoplay: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },
    controls: { type: Boolean, default: false },
    options: { type: Object as PropType<Partial<WebStreamPlayerOptions>>, default: () => ({}) }
  },
  emits: ['ready', 'statechange', 'error', 'stats', 'metadata'],
  setup(props, { emit, expose }) {
    const mount = ref<HTMLElement>()
    const player = shallowRef<StreamPlayer>()

    const load = async () => {
      if (!player.value) return
      await player.value.load(props.source)
      emit('ready', player.value)
    }

    onMounted(async () => {
      if (!mount.value) return
      const instance = createWebStreamPlayer({
        ...props.options,
        target: mount.value,
        autoplay: props.autoplay,
        muted: props.muted,
        controls: props.controls
      })
      instance.on('statechange', (event) => emit('statechange', event))
      instance.on('error', (event) => emit('error', event))
      instance.on('stats', (event) => emit('stats', event))
      instance.on('metadata', (event) => emit('metadata', event))
      player.value = instance
      await load()
    })

    watch(() => props.source, () => void load(), { deep: true })
    watch(() => props.muted, (muted) => player.value?.setMuted(muted))
    onBeforeUnmount(() => void player.value?.destroy())

    expose({
      player,
      load,
      play: () => player.value?.play(),
      pause: () => player.value?.pause(),
      getState: (): PlayerState | undefined => player.value?.currentState
    })
    return () => h('div', { ref: mount, class: 'web-stream-player' })
  }
})

export default WebStreamPlayer
export * from 'web-stream-player'

