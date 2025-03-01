const PUBLIC_ROOM_ID = 1
const socketService = require('../services/socketService')
const { authenticatedSocket } = require('../middleware/auth')
const { generateMessage } = require('./message')
let activeUsers = []


module.exports = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    rejectUnauthorized: false,
    maxHttpBufferSize: 100000000,
  })


  io.use(authenticatedSocket).on('connection', async socket => {
    console.log('== connected! ===')
    console.log(socket.userId)

    socket.onAny((event, ...args) => {
      console.log(event, args)
    })

    io.emit('debug notice', `安安收到token${socket.handshake.auth.token}`)
    
    const userId = socket.userId

    const user = await socketService.getUser(userId)
    console.log(user)
    socket.on('join', ({ roomId }) => {

      roomId = Number(roomId)
      socket.join(`${roomId}`)
      console.log('socket.rooms', socket.rooms)
      io.emit('debug notice', '安安這是後端, 有收到上線訊息')
      if (roomId === PUBLIC_ROOM_ID) {
        const isActiveUser = activeUsers.filter(i => i.id === userId)
        if (!isActiveUser.length) {
          // notify everyone except the user
          io.to(`${PUBLIC_ROOM_ID}`).emit('message', { message: `${user.name}上線`, type: 'notice' })
        }
        activeUsers.push(user)
        const set = new Set()
        activeUsers = activeUsers.filter(i => !set.has(i.id)?set.add(i.id):false)
        
        io.to(`${PUBLIC_ROOM_ID}`).emit('active users', {
          activeUsers,
          userCount: activeUsers.length,
        })
      }
    })

    socket.on('leave', ({ roomId }) => {
      console.log('== receive leave message===')
      console.log(userId)
      io.emit('debug notice', `安安這是後端, 有收到來自UserId:${userId} 離開 RoomId${roomId}的訊息`)
      if (roomId) {
        socket.leave(`${roomId}`)
        if (roomId === PUBLIC_ROOM_ID) {
          activeUsers = activeUsers.filter(i => {
            return i.id !== userId
          })
          io.to(`${PUBLIC_ROOM_ID}`).emit('message', { message: `${user.name}下線`, type: 'notice' })
          io.to(`${PUBLIC_ROOM_ID}`).emit('active users', {
            activeUsers,
            userCount: activeUsers.length,
          })
        }
      }
    })

    socket.on('public chat', async (message) => {
      console.log('=== receive public chat message ===')
      await socketService.storeMessage(message, userId)
      io.to(`${PUBLIC_ROOM_ID}`).emit('debug notice', '安安這是後端, 有收到公共聊天室訊息')
      io.to(`${PUBLIC_ROOM_ID}`).emit('public chat', generateMessage(message, userId, user.avatar, 'message'))
    })

    socket.on('private chat', async (message) => {
      console.log('=== receive private chat message ===')
      await socketService.storeMessage(message, userId)
      console.log(message.roomId)
      io.emit('debug notice', `安安這是後端, 有收到來自${userId}私訊訊息`)
      io.to(`${message.roomId}`).emit('private chat', generateMessage(message, userId, user.avatar, 'message'))
      io.to(`${message.roomId}`).emit('private notice', { message: '這是一個私訊通知', userId, type: 'notice'})
    })
  })
}

