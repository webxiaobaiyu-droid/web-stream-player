#!/usr/bin/env node
import { loadRelayConfig } from './config'
import { startRelayServer } from './server'

const configPath = process.argv[2] ?? process.env.WSP_RELAY_CONFIG ?? './relay.config.json'
const config = await loadRelayConfig(configPath)
const server = await startRelayServer(config)

console.log(`Web Stream Relay listening on http://${config.host}:${config.port}`)
console.log(`Configured streams: ${Object.keys(config.streams).join(', ')}`)

const shutdown = async () => {
  await server.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

