import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const workspaceRoot = resolve(__dirname, '../..')

function productionBase(): string {
  if (process.env.VITE_PLAYGROUND_BASE_PATH) return process.env.VITE_PLAYGROUND_BASE_PATH
  const siteBase = process.env.VITE_BASE_PATH ?? '/'
  return `${siteBase.endsWith('/') ? siteBase : `${siteBase}/`}playground/`
}

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : productionBase(),
  plugins: [vue()],
  resolve: {
    alias: {
      'web-stream-player': resolve(workspaceRoot, 'packages/player/src/index.ts'),
      '@web-stream-player/core': resolve(workspaceRoot, 'packages/core/src/index.ts'),
      '@web-stream-player/hls': resolve(workspaceRoot, 'packages/hls/src/index.ts'),
      '@web-stream-player/mpegts': resolve(workspaceRoot, 'packages/mpegts/src/index.ts'),
      '@web-stream-player/webcodecs': resolve(workspaceRoot, 'packages/webcodecs/src/index.ts')
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/hls.js@')) return 'engine-hls'
          if (id.includes('/mpegts.js@')) return 'engine-mpegts'
          if (id.includes('/vue@') || id.includes('/lucide-vue-next@')) return 'vendor-vue'
          return undefined
        }
      }
    }
  }
}))
