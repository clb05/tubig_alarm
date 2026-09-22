import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server as SocketIOServer } from 'socket.io'

const PORT = Number.parseInt(process.env.PORT ?? '3001', 10)
const TEN_MINUTES = 10 * 60 * 1000
const configuredOrigins = (process.env.FRONTEND_ORIGIN ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`CORS origin not allowed: ${origin}`))
  },
}

const app = express()
const httpServer = http.createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
})

const readings = []
let nextReadingId = 1

app.use(cors(corsOptions))
app.use(express.json({ limit: '32kb' }))

function getDeviceStatus() {
  const latest = readings.at(-1)
  const lastSeenAt = latest?.receivedAt ?? null
  const online = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() <= TEN_MINUTES : false
  return { online, lastSeenAt }
}

function parseReading(body) {
  const level = Number(body?.level)
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  const timestamp = body?.timestamp ? new Date(body.timestamp) : new Date()

  if (!Number.isInteger(level) || level < 0 || level > 4) {
    throw new Error('level must be an integer from 0 to 4')
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('lat must be a number between -90 and 90')
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('lng must be a number between -180 and 180')
  }
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('timestamp must be a valid date')
  }

  return {
    id: `reading-${nextReadingId++}`,
    level,
    lat,
    lng,
    timestamp: timestamp.toISOString(),
    receivedAt: new Date().toISOString(),
    smsSent: false,
  }
}

app.post('/api/readings', (request, response) => {
  try {
    const reading = parseReading(request.body)
    readings.push(reading)
    io.emit('reading:new', reading)
    response.status(201).json(reading)
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Invalid reading' })
  }
})

app.get('/api/readings/latest', (_request, response) => {
  response.json(readings.at(-1) ?? null)
})

app.get('/api/readings/history', (_request, response) => {
  response.json(readings.slice().reverse())
})

app.get('/api/device/status', (_request, response) => {
  response.json(getDeviceStatus())
})

app.get('/health', (_request, response) => {
  response.json({ ok: true })
})

io.on('connection', (socket) => {
  socket.emit('device:status', getDeviceStatus())
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`FLOOD_ALERT backend listening on port ${PORT}`)
})