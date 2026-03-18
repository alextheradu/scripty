const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

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
      socket.data.user = user
      socket.data.scriptId = scriptId
      socket.data.authenticated = !!(user?.id && !String(user.id).startsWith('anon'))
      socket.data.color = COLORS[Math.floor(Math.random() * COLORS.length)]
      socket.join(`script:${scriptId}`)
      io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
    })

    socket.on('script:leave', ({ scriptId }) => {
      socket.leave(`script:${scriptId}`)
      io.to(`script:${scriptId}`).emit('cursor:clear', { socketId: socket.id })
      io.to(`script:${scriptId}`).emit('selection:update', { socketId: socket.id, selection: null })
      io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
    })

    socket.on('presence:ping', ({ scriptId }) => {
      const activeScriptId = scriptId || socket.data.scriptId
      if (!activeScriptId) return
      io.to(`script:${activeScriptId}`).emit('presence:update', getRoomPresence(io, activeScriptId))
    })

    socket.on('line:update', (data) => {
      // Block anonymous/unauthenticated sockets from broadcasting edits
      const uid = socket.data.user?.id
      if (!uid || String(uid).startsWith('anon-') || !socket.data.authenticated) return
      socket.to(`script:${data.scriptId}`).emit('line:update', data)
    })

    socket.on('cursor:move', (data) => {
      socket.to(`script:${data.scriptId}`).emit('cursor:move', {
        ...data,
        socketId: socket.id,
        user: { ...socket.data.user, color: socket.data.color },
      })
    })

    socket.on('selection:update', (data) => {
      socket.to(`script:${data.scriptId}`).emit('selection:update', {
        socketId: socket.id,
        selection: data.selection ?? null,
        user: { ...socket.data.user, color: socket.data.color },
      })
    })

    socket.on('chat:send', (data) => {
      socket.to(`script:${data.scriptId}`).emit('chat:message', data)
    })

    socket.on('disconnect', () => {
      const { scriptId } = socket.data
      if (scriptId) {
        io.to(`script:${scriptId}`).emit('cursor:clear', { socketId: socket.id })
        io.to(`script:${scriptId}`).emit('selection:update', { socketId: socket.id, selection: null })
        io.to(`script:${scriptId}`).emit('presence:update', getRoomPresence(io, scriptId))
      }
    })
  })

  const PORT = parseInt(process.env.PORT || '3009', 10)
  httpServer.listen(PORT, () => {
    console.log(`> Scripty ready on http://localhost:${PORT}`)
  })
})
