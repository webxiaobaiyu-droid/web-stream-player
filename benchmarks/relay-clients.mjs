import WebSocket from 'ws'

const cliArguments = process.argv.slice(2)
if (cliArguments[0] === '--') cliArguments.shift()

const [
  url = 'ws://127.0.0.1:8787/stream/camera',
  clientCountInput = '1',
  sampleSecondsInput = '10'
] = cliArguments

const clientCount = Number.parseInt(clientCountInput, 10)
const sampleSeconds = Number.parseFloat(sampleSecondsInput)

if (!Number.isInteger(clientCount) || clientCount < 1) {
  throw new Error('clientCount must be a positive integer.')
}
if (!Number.isFinite(sampleSeconds) || sampleSeconds <= 0) {
  throw new Error('sampleSeconds must be greater than zero.')
}

const benchmarkStartedAt = performance.now()
const sessions = await Promise.all(
  Array.from({ length: clientCount }, (_, index) => connect(index, url))
)

for (const session of sessions) {
  session.bytes = 0
  session.messages = 0
}
const sampleStartedAt = performance.now()
await delay(sampleSeconds * 1000)
const sampleElapsedMs = performance.now() - sampleStartedAt

await Promise.all(sessions.map(({ socket }) => close(socket)))
const elapsedMs = performance.now() - benchmarkStartedAt
const totalBytes = sessions.reduce((total, session) => total + session.bytes, 0)
const totalMessages = sessions.reduce((total, session) => total + session.messages, 0)

console.log(JSON.stringify({
  url,
  clients: clientCount,
  requestedSampleSeconds: sampleSeconds,
  elapsedSeconds: round(elapsedMs / 1000),
  sampleElapsedSeconds: round(sampleElapsedMs / 1000),
  firstByteMs: sessions.map((session) => round(session.firstByteMs)),
  totalBytes,
  totalMessages,
  aggregateMbps: round(totalBytes * 8 / (sampleElapsedMs * 1000)),
  perClientMbps: sessions.map((session) => round(session.bytes * 8 / (sampleElapsedMs * 1000)))
}, null, 2))

function connect(index, targetUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(targetUrl)
    const startedAt = performance.now()
    const session = { socket, bytes: 0, messages: 0, firstByteMs: 0 }
    const timeout = setTimeout(() => {
      socket.terminate()
      reject(new Error(`Client ${index + 1} did not receive media within 10 seconds.`))
    }, 10_000)

    socket.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    socket.on('message', (data) => {
      session.bytes += data.byteLength
      session.messages++
      if (session.firstByteMs === 0) {
        session.firstByteMs = performance.now() - startedAt
        clearTimeout(timeout)
        resolve(session)
      }
    })
  })
}

function close(socket) {
  return new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve()
      return
    }
    socket.once('close', resolve)
    socket.close(1000, 'benchmark complete')
  })
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function round(value) {
  return Math.round(value * 100) / 100
}
