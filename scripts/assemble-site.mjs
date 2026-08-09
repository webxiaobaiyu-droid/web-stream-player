import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playgroundDist = resolve(root, 'apps/playground/dist')
const siteDist = resolve(root, 'apps/site/.vitepress/dist')
const target = resolve(siteDist, 'playground')

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(playgroundDist, target, { recursive: true })
