import { Server } from 'socket.io'

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server)
  res.socket.server.io = io

  io.on('connection', (socket) => {
    console.log('Client connected')

    socket.on('draw-line', (data) => {
      socket.broadcast.emit('draw-line', data)
    })

    socket.on('text-update', (text) => {
      socket.broadcast.emit('text-update', text)
    })

    socket.on('clear-canvas', () => {
      socket.broadcast.emit('clear-canvas')
    })
  })

  res.end()
}

export default SocketHandler