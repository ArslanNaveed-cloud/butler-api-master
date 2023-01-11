
const jwt = require('jsonwebtoken')
const { default: mongoose } = require('mongoose')
const { FREELANCER, CLIENT } = require('../../helpers/constants')
const { sendPushNotification } = require('../../helpers/fcmTokenHelper')
const fs = require('fs').promises
const { ChatRoom } = require('./chatRoom.model')
const { ChatRoomMessages } = require('./chatRoomMessages.model')

module.exports = function (io) {
  const activeFreelancers = []
  const activeClients = []
  const nsp = io.of('/')
  nsp.on('connection', (socket) => {
    nsp.emit('updatedUserStatus', { users: { activeClients, activeFreelancers } })
    socket.on('connectToRoom', (data) => {
      socket.leaveAll()
      socket.join(data.chatRoomId)
    })
    socket.on('connectToChats', (data) => {
      const user = extractUserFromTokenForStreams(data.token, socket)
      if (!user) {
        return socket.emit('exception', { status: false, message: 'User Not Found!' })
      }
      if (user) {
        socket.userId = user.id
        if (user.userType === FREELANCER && activeFreelancers.findIndex((id) => id === user.id) < 0) {
          activeFreelancers.push(user.id)
          nsp.emit('updatedUserStatus', { users: { activeClients, activeFreelancers } })
        }
        if (user.userType === CLIENT && activeClients.findIndex((id) => id === user.id) < 0) {
          activeClients.push(user.id)
          nsp.emit('updatedUserStatus', { users: { activeClients, activeFreelancers } })
        }
      }
      socket.leave(user.id)
      socket.join(user.id)
    })
    socket.on('readChat', async (data) => {
      const user = extractUserFromTokenForStreams(data.token, socket)
      if (!user) {
        return
      }
      if (!data.chatRoomId || typeof (data.chatRoomId) !== 'string') {
        return socket.emit('exception', { message: 'Invalid Request Chat Room Not Specified!.' })
      }
      let setQuery = {}
      let chatRoom
      if ((data.lastMsgById && data.lastMsgById !== user.id) || data.isLastCheckInMsg) {
        if (user.isAdmin) {
          setQuery = { $set: { 'admins.$.isRead': true, 'admins.$.readAt': new Date(), 'admins.$.lastReadMsg': data.lastMsgID } }
          chatRoom = await ChatRoom.findOneAndUpdate({ _id: data.chatRoomId, admins: { $elemMatch: { participant: mongoose.Types.ObjectId(user.id) } } }, setQuery, { new: true })
          nsp.to(chatRoom.user.participant.toString()).emit('updatedChatRoomStatus', { chatRoom: chatRoom })
          for (let i = 0; i < chatRoom.admins.length; i++) {
            nsp.to(chatRoom.admins[i].participant.toString()).emit('updatedChatRoomStatus', { chatRoom: chatRoom })
          }
        } else {
          setQuery = { $set: { 'user.$.isRead': true, 'user.$.readAt': new Date(), 'user.$.lastReadMsg': data.lastMsgID } }
          chatRoom = await ChatRoom.findOneAndUpdate({ _id: data.chatRoomId, 'user.participant': mongoose.Types.ObjectId(user.id) }, setQuery, { new: true })
          for (let i = 0; i < chatRoom.admins.length; i++) {
            nsp.to(chatRoom.admins[i].participant).emit('updatedChatRoomStatus', { chatRoom: chatRoom })
          }
        }
      }
    })
    // socket.on('getChatMessages', async (data) => {
    //   const user = extractUserFromTokenForStreams(data.token, socket)
    //   if (!user) {
    //     return
    //   }
    //   const chatRoom = await ChatRoom.findById(data.chatRoomId)
    //   if (!chatRoom) {
    //     socket.emit('exception', { message: 'Invalid Request Chat Room Not Found!.' })
    //     return
    //   }
    //   let participant
    //   const pageNo = data.pageNo ? Number(data.pageNo) : 1
    //   const skip = pageNo === 1 ? 0 : ((pageNo - 1) * data.limit)
    //   if (user.isAdmin) {
    //     participant = chatRoom.admins.find(admin => {
    //       return admin.participant.toString() === user.id
    //     })
    //   } else {
    //     participant = chatRoom.user
    //   }
    //   if (participant) {
    //     const totalCount = await ChatRoomMessages.aggregate([{ $match: { chatRoomId: mongoose.Types.ObjectId(data.chatRoomId) } }, { $project: { count: { $size: '$messages' } } }])

    //     const chatMsgs = await ChatRoomMessages.aggregate([
    //       { $match: { chatRoomId: mongoose.Types.ObjectId(data.chatRoomId) } },
    //       { $unwind: '$messages' },
    //       { $skip: skip },
    //       { $limit: data.limit || 50 },
    //       { $sort: { 'messages.sentAt': 1 } },
    //       {
    //         $project: {
    //           _id: 1,
    //           body: '$messages.body',
    //           sender: '$messages.sender',
    //           sentAt: '$messages.sentAt',
    //           attachment: '$messages.attachment'
    //         }
    //       }
    //     ])
    //     nsp.to(user.id).emit('chatMessages', { messages: chatMsgs, totalCount: totalCount })
    //   }
    // })
    socket.on('getUnReadMessages', async (data) => {
      const user = extractUserFromTokenForStreams(data.token, socket)
      if (!user) {
        return
      }
      const chatRoom = await ChatRoom.findById(data.chatRoomId)
      if (!chatRoom) {
        socket.emit('exception', { message: 'Invalid Request Chat Room Not Found!.' })
        return
      }
      let participant
      if (user.isAdmin) {
        participant = chatRoom.admins.find(admin => {
          return admin.participant.toString() === user.id
        })
      } else {
        participant = chatRoom.user
      }
      if (participant) {
        const chatMessages = await ChatRoomMessages.findOne({ chatRoomId: data.chatRoomId })
        // const index = chatMessages.messages.findIndex(x => {
        //   return x._id.toString() === participant.lastReadMsg.toString()
        // })
        nsp.to(user.id).emit('unReadMessages', { messages: chatMessages?.messages.reverse() })
      }
    })
    socket.on('sendMessage', async (data) => {
      try {
        const user = extractUserFromTokenForStreams(data.token, socket)
        if (!user) {
          return
        }
        let message = {}
        if (!data.message && !data.url && !data.file) {
          socket.emit('exception', { message: 'Empty messages are not allowed' })
          return
        }
        if (data.url && !data.msgType) {
          socket.emit('exception', { message: 'msgType is required against url' })
          return
        }
        if (data.replyTo && data.replyTo.message) {
          message = {
            sender: user.id,
            body: data.message,
            replyTo: {
              message: data.replyTo.message,
              body: (!data.replyTo.body) ? '' : ((data.replyTo.body).length > 49) ? (data.replyTo.body).substring(0, 50) + '...' : data.replyTo.body,
              type: (data.replyTo.msgType) ? data.replyTo.msgType : 'text'
            },
            sentAt: new Date()
          }
        } else {
          message = {
            sender: user.id,
            body: data.message,
            sentAt: new Date()
          }
        }

        if (!data.chatRoomId) {
          socket.emit('exception', { message: 'Invalid Request Chat Room Not Specified!.' })
        } else if (data.chatRoomId) {
          const chatRoom = await ChatRoom.findById(data.chatRoomId)
          if (!chatRoom) {
            socket.emit('exception', { message: 'Invalid Request Chat Room Not Found!.' })
            return
          } else if (chatRoom.isDisabled) {
            socket.emit('exception', { message: "You Can't reply to this coversation because chat is disabled!." })
            return
          }
          if (user.isAdmin) {
            if (!chatRoom.admins.find(p => p.participant.equals(user.id))) {
              socket.emit('exception', { message: "You Can't reply to this coversation!." })
              return
            }
          } else {
            if (!chatRoom.user.participant.equals(user.id)) {
              socket.emit('exception', { message: "You Can't reply to this coversation!." })
              return
            }
          }

          let fileResult = {}
          try {
            if ((data.msgType === 'image') || (data.msgType === 'file') || (data.msgType === 'video') || (data.msgType === 'audio')) {
              message.attachment = {}
              if (data.msgType === 'image') {
                if (!data.isUrl) {
                  fileResult = await socketUploadStaticFile(socket, data.file, 2, 'messages_static_data', '.jpg')
                }
                if (!fileResult.success && !data.isUrl) {
                  socket.emit('exception', { message: "Couldn't upload!.", status: false })
                  return
                } else {
                  message.attachment.image = process.env.SERVER_URL + (data.isUrl === true ? data.url : fileResult.path)
                  message.attachment.t = 'image'
                  message.attachment.size = data.attachmentSize
                }
              } else if (data.msgType === 'audio') {
                if (!data.isUrl) {
                  fileResult = await socketUploadStaticFile(socket, data.file, 5, 'messages_static_data', 'audio.aac')
                }
                if (!fileResult.success && !data.isUrl) {
                  socket.emit('exception', { message: "Couldn't upload!.", status: false })
                  return
                } else {
                  message.attachment.audio = process.env.SERVER_URL + (data.isUrl === true ? data.url : fileResult.path)
                  message.attachment.t = 'audio'
                  message.attachment.size = data.attachmentSize
                }
              } else if (data.msgType === 'video') {
                if (!data.isUrl) {
                  fileResult = await socketUploadStaticFile(socket, data.file, 10, 'messages_static_data', '.' + data.fileName)
                }
                if (!fileResult.success && !data.isUrl) {
                  socket.emit('exception', { message: "Couldn't upload!.", status: false })
                  return
                } else {
                  message.attachment.video = process.env.SERVER_URL + (data.isUrl === true ? data.url : fileResult.path)
                  message.attachment.t = 'video'
                  message.attachment.size = data.attachmentSize
                }
              } else if (data.msgType === 'file') {
                if (!data.fileName && !data.isUrl) {
                  socket.emit('exception', { message: "Couldn't upload, fileName is required", status: false })
                  return
                }
                if (!data.isUrl) {
                  fileResult = await socketUploadStaticFile(socket, data.file, 10, 'messages_static_data', '.' + data.fileName)
                }
                if (!fileResult.success && !data.isUrl) {
                  socket.emit('exception', { message: "Couldn't upload!.", status: false })
                  return
                } else {
                  message.attachment.file = process.env.SERVER_URL + (data.isUrl === true ? data.url : fileResult.path)
                  message.attachment.t = 'file'
                  message.attachment.size = data.attachmentSize
                }
              }
            }
            const chatRoomMessagesFound = await ChatRoomMessages.updateOne(
              { chatRoomId: chatRoom._id },
              { $push: { messages: { $each: [message], $position: 0 } } },
              { upsert: true }
            )
            // console.log(chatRoomMessagesFound)
            if ((chatRoomMessagesFound.n === 0) || (chatRoomMessagesFound.nModified === 0)) {
              const chatRoomMessages = await ChatRoomMessages.create({
                chatRoomId: data.chatRoomId,
                messages: [message]
              })
              const savedChatRoomMessages = await chatRoomMessages.save()

              const chatRoomMessagesDoc = await ChatRoomMessages.populate(savedChatRoomMessages, [
                { path: 'messages.sender', select: 'nickName' }
              ])
              if (chatRoomMessagesDoc?.messages[0].attachment && chatRoomMessagesDoc?.messages[0].attachment.t) {
                chatRoom.lastMessage = {
                  _id: chatRoomMessagesDoc.messages[0]._id,
                  sender: chatRoomMessagesDoc.messages[0].sender,
                  sentAt: chatRoomMessagesDoc.messages[0].sentAt,
                  body: 'Attachment'
                }
              } else {
                chatRoom.lastMessage = chatRoomMessagesDoc.messages[0]
              }

              if (user.isAdmin) {
                chatRoom.user.isRead = false
              } else {
                for (let i = 0; i < chatRoom.admins.length; i++) {
                  chatRoom.admins[i].isRead = false
                }
              }

              const savedChatRoom = await chatRoom.save()

              const participant = []
              chatRoom.participants.forEach(element => {
                if (element.participant !== user._id) {
                  participant.push(element.participant)
                }
              })
              const dataToSend = {
                _id: chatRoomMessagesDoc._id,
                chatRoom: savedChatRoom,
                messages: chatRoomMessagesDoc.messages
              }
              for (let i = 0; i < chatRoom.participants.length; i++) {
                nsp.to(chatRoom.participants[i].participant).emit('messageData', dataToSend)
              }
              // nsp.in(data.chatRoomId).emit('messageData', dataToSend);
              try {
                let tokendata = {}
                for (let i = 0; i < participant.length; i++) {
                  tokendata = { userId: participant[i], message: data.message, title: 'New Message', payload: { key: 'value' } }
                  sendPushNotification(tokendata)
                }
              } catch (ex) {
                console.log(ex.message)
              }
              return
              // res.send(updatedChatRoomMessages);
            }

            // chatRoomMessages.messages.unshift(message);
            // await chatRoomMessages.save();
            const updatedChatRoomMessages = await ChatRoomMessages.findOne({ chatRoomId: data.chatRoomId }, { messages: { $slice: [0, 1] } })
              .populate('messages.sender', 'nickName').lean()
            // const savedChatRoomMessages = await chatRoomMessages.save();
            // console.log(savedChatRoomMessages)
            // savedChatRoomMessages.messages.splice(1, updatedChatRoomMessages.messages.length - 1);
            // const chatRoomMessagesDoc = await ChatRoomMessages.populate(savedChatRoomMessages, [{ path: 'messages.sender', select: 'nickName' }]);
            // chatRoom.lastMessage = updatedChatRoomMessages.messages[0];
            if (updatedChatRoomMessages.messages[0].attachment && updatedChatRoomMessages.messages[0].attachment.t) {
              chatRoom.lastMessage = {
                _id: updatedChatRoomMessages.messages[0]._id,
                sender: updatedChatRoomMessages.messages[0].sender,
                sentAt: updatedChatRoomMessages.messages[0].sentAt,
                body: 'Attachment'
              }
            } else {
              chatRoom.lastMessage = updatedChatRoomMessages.messages[0]
            }

            if (user.isAdmin) {
              chatRoom.user.participant.isRead = false
            } else {
              for (let i = 0; i < chatRoom.admins.length; i++) {
                if (chatRoom.admins[i].participant !== user._id) {
                  chatRoom.admins[i].isRead = false
                }
              }
            }

            const savedChatRoom = await chatRoom.save()

            const participant = []
            if (user.isAdmin) {
              participant.push(chatRoom.user.participant)
            } else {
              chatRoom.admins.forEach(a => {
                participant.push(a.participant)
              })
            }

            const dataToSend = {
              _id: updatedChatRoomMessages._id,
              chatRoom: savedChatRoom,
              messages: updatedChatRoomMessages.messages
            }
            nsp.to(chatRoom.user.participant.toString()).emit('messageData', dataToSend)
            // if (user.isAdmin) {
            //   nsp.to(chatRoom.user.participant).emit('messageData', dataToSend)
            // } else {}
            for (let i = 0; i < chatRoom.admins.length; i++) {
              nsp.to(chatRoom.admins[i].participant.toString()).emit('messageData', dataToSend)
            }
            try {
              let tokendata = {}
              for (let i = 0; i < participant.length; i++) {
                tokendata = { userId: participant[i], message: data.message, title: 'New Message', payload: { key: 'value' } }
                sendPushNotification(tokendata)
              }
            } catch (ex) {
              console.log(ex.message)
            }
          } catch (error) {
            await fs.unlink(fileResult.path).catch(er => { return false })
            console.log(error.message)
          }
        }
      } catch (error) {
        socket.emit('exception', { message: error.message, status: false })
      }
    })
    socket.on('disconnect', (data) => {
      if (socket.userId) {
        let index = activeFreelancers.indexOf(socket.userId)
        if (index > -1) {
          activeFreelancers.splice(index, 1)
        } else {
          index = activeClients.indexOf(socket.userId)
          if (index > -1) {
            activeClients.splice(index, 1)
          }
        }
        nsp.emit('updatedUserStatus', { users: { activeClients, activeFreelancers } })
      }
    })
    socket.on('disconnecting', () => {
      console.log('diconnecting')
    })
  })
}
const extractUserFromTokenForStreams = (token, socket) => {
  if (!token) {
    socket.emit('exception', { message: 'Access denied. No token provided.' })
    return false
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_JWT)
    return decoded
  } catch (error) {
    socket.emit('exception', { message: 'Invalid Token!' })
    return false
  }
}
const socketUploadStaticFile = async (socket, fileBuffer, sizeLimit, savelocation, fileOriginalName) => {
  const size = Buffer.byteLength(fileBuffer) / (1024 * 1024)
  if (size > sizeLimit) {
    socket.emit('exception', { message: `File size is greater than ${sizeLimit}MB!`, status: false })
    return { success: false }
  }
  const path = 'uploads/' + savelocation + '/' + Date.now() + fileOriginalName
  let success = {}
  await fs.writeFile(path, fileBuffer).then(async (v) => {
    success = { success: true, path: path }
  })
  // .catch(err => {
  //   socket.emit('exception', { message: 'Couldn\'t upload!', status: false })
  //   success = { success: false }
  // })
  return success
}
