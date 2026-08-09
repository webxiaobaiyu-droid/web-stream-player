import { createServer, type Server } from 'node:http'
import { WebSocketServer } from 'ws'
import type { NormalizedRelayConfig } from './config'
import { StreamHub } from './hub'

export interface RelayServer {
  readonly httpServer: Server
  readonly hubs: Map<string, StreamHub>
  close(): Promise<void>
}

export async function startRelayServer(config: NormalizedRelayConfig): Promise<RelayServer> {
  const hubs = new Map(
    Object.entries(config.streams).map(([id, stream]) => [id, new StreamHub(id, stream, config)])
  )
  const websocketServer = new WebSocketServer({ noServer: true, perMessageDeflate: false })
  const httpServer = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (request.url === '/health') {
      response.end(JSON.stringify({
        ok: true,
        streams: [...hubs.values()].map((hub) => hub.snapshot())
      }))
      return
    }
    if (request.url === '/streams') {
      response.end(JSON.stringify({
        streams: Object.entries(config.streams).map(([id, stream]) => ({ id, label: stream.label ?? id }))
      }))
      return
    }
    response.statusCode = 404
    response.end(JSON.stringify({ error: 'not_found' }))
  })

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const match = url.pathname.match(/^\/stream\/([a-zA-Z0-9_-]+)$/)
    if (!match) {
      socket.destroy()
      return
    }
    if (config.accessToken && url.searchParams.get('token') !== config.accessToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    const hub = hubs.get(match[1] ?? '')
    if (!hub) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }
    websocketServer.handleUpgrade(request, socket, head, (client) => {
      websocketServer.emit('connection', client, request)
      hub.addClient(client)
    })
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(config.port, config.host, () => resolve())
  })

  return {
    httpServer,
    hubs,
    close: async () => {
      for (const hub of hubs.values()) hub.destroy()
      websocketServer.close()
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    }
  }
}

