const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const COLORS = ['#e05252','#e8b86d','#52c0e0','#7ce052','#c052e0','#e07c52','#52e0b8','#8052e0']

function getRoomPresence(io, scriptId) {
  const sockets = io.sockets.adapter.rooms.get(`script:${scriptId}`)
  if (!sockets) return []
  return [...sockets].map(id => {
    const s = io.sockets.sockets.get(id)
    return s ? { ...s.data.user, color: s.data.color, socketId: id } : null
  }).filter(Boolean)
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXTAUTH_URL || 'http://localhost:3009', credentials: true },
  })

  /** @type {import('socket.io').Server} */
  global.io = io

  io.on('connection', (socket) => {
    socket.on('script:join', ({ scriptId, user }) => {
      socket.join(`script:${scriptId}`)
      socket.data.scriptId = scriptId
      socket.data.user = user
      socket.data.color = COLORS[Math.floor(Math.random() * COLORS.length)]
      io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
    })

    socket.on('script:leave', ({ scriptId }) => {
      socket.leave(`script:${scriptId}`)
      io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
    })

    socket.on('line:update', (data) => {
      socket.to(`script:${data.scriptId}`).emit('line:update', data)
    })

    socket.on('cursor:move', (data) => {
      socket.to(`script:${data.scriptId}`).emit('cursor:move', {
        ...data,
        user: { ...socket.data.user, color: socket.data.color },
      })
    })

    socket.on('chat:send', (data) => {
      socket.to(`script:${data.scriptId}`).emit('chat:message', data)
    })

    socket.on('disconnect', () => {
      const { scriptId } = socket.data
      if (scriptId) io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
    })
  })

  const PORT = parseInt(process.env.PORT || '3009', 10)
  httpServer.listen(PORT, () => {
    console.log(`> Scripty ready on http://localhost:${PORT}`)
  })
})
