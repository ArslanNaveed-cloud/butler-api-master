/* eslint-disable no-useless-catch */
const { ChatRoom } = require('./chatRoom.model')
const Admin = require('../admin/admin.model')
const { default: mongoose } = require('mongoose')
const { ErrorHandler } = require('../../helpers/ErrorHandler')
const { NOT_FOUND, INTERNAL_ERR, CONFLICT } = require('../../helpers/HTTP.CODES')
const { SA_ROLE_TITLE, OPEN_CHAT, SUPPORT } = require('../../helpers/constants')
const { ChatRoomMessages } = require('./chatRoomMessages.model')

/// Admin Routes///

exports.getAdminChatRooms = async (queryParams, currentUser) => {
  const currentpage = (queryParams.pageNo) ? queryParams.pageNo : 1
  const numOfItems = (queryParams.pageSize) ? queryParams.pageSize : 100
  const matchQuery = {}
  if (queryParams.roomType) {
    matchQuery.roomType = queryParams.roomType
  }
  matchQuery.admins = {
    $elemMatch: {
      participant: mongoose.Types.ObjectId(currentUser.id),
      isDeleted: false
    }
  }
  const chatRooms = await ChatRoom.aggregate([
    {
      $match: matchQuery
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'job'
      }
    },
    {
      $project: {
        _id: 1, lastMessage: 1, isDisabled: 1, admins: 1, user: 1, job: 1
      }
    },
    {
      $facet: {
        data: [{ $sort: { 'lastMessage.sentAt': -1 } }, { $skip: ((currentpage - 1) * numOfItems) }, { $limit: numOfItems }],
        count: [{ $count: 'totalCount' }]
      }
    }
  ])
  await ChatRoom.populate(chatRooms[0].data, [{ path: 'job admins.participant user.participant', select: 'fullName email profileImage' }])
  return chatRooms
}

//  user routes //
exports.getChatRoomsForUsers = async (queryParams, currentUser) => {
  const currentpage = (queryParams.pageNo) ? queryParams.pageNo : 1
  const numOfItems = (queryParams.pageSize) ? queryParams.pageSize : 100
  const matchQuery = { 'user.participant': mongoose.Types.ObjectId(currentUser.id) }
  const chatRooms = await ChatRoom.aggregate([
    {
      $match: matchQuery
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'job'
      }
    },
    {
      $project: {
        _id: 1, lastMessage: 1, isDisabled: 1, admins: 1, user: 1, job: 1
      }
    },
    {
      $facet: {
        data: [{ $sort: { 'lastMessage.sentAt': -1 } }, { $skip: ((currentpage - 1) * numOfItems) }, { $limit: numOfItems }],
        count: [{ $count: 'totalCount' }]
      }
    }
  ])
  await ChatRoom.populate(chatRooms[0].data, [{ path: 'job admins.participant user.participant', select: 'fullName email profileImage' }])
  return chatRooms
}

exports.createOpenChat = async (currentUser, queryParams) => {
  try {
    const { support } = queryParams
    const superAdmin = await Admin.aggregate([{
      $lookup: {
        from: 'roles',
        localField: 'role',
        foreignField: '_id',
        as: 'role'
      }
    },
    {
      $match: {
        'role.title': SA_ROLE_TITLE
      }
    }])
    if (!superAdmin[0]._id) {
      throw ErrorHandler('S.Admin not found', INTERNAL_ERR)
    }
    const existingOpenChat = await ChatRoom.findOne(
      {
        'user.participant': mongoose.Types.ObjectId(currentUser.id),
        roomType: OPEN_CHAT
      })
    if (existingOpenChat && !support) {
      throw ErrorHandler('openchat already exist', CONFLICT)
    }
    const existingSupportChat = await ChatRoom.findOne(
      {
        'user.participant': mongoose.Types.ObjectId(currentUser.id),
        roomType: SUPPORT
      })
    if (existingSupportChat && support) {
      throw ErrorHandler('supportchat already exist', CONFLICT)
    }
    const adminS = [{ participant: superAdmin[0]._id }]
    const clientChat = new ChatRoom({
      admins: adminS,
      roomType: support ? SUPPORT : OPEN_CHAT,
      user: { participant: currentUser.id }
    })
    await clientChat.save()
    return clientChat
  } catch (error) {
    throw error
  }
}
// common  routes //
exports.getChatById = async (id) => {
  try {
    const chatRoom = await ChatRoom.findById(id).populate('job admins.participant user.participant')
    if (!chatRoom) {
      throw ErrorHandler('no chatroom found', NOT_FOUND)
    }
    return chatRoom
  } catch (error) {
    throw error
  }
}

exports.getChatMessages = async (queryParams, currentUser) => {
  const { chatRoomId } = queryParams
  const pageNo = queryParams.pageNo ? Number(queryParams.pageNo) : 1
  const limit = queryParams.limit ? Number(queryParams.limit) : 10
  if (!currentUser) {
    return
  }
  const chatRoom = await ChatRoom.findById(chatRoomId)
  if (!chatRoom) {
    throw ErrorHandler('Invalid Request Chat Room Not Found!', NOT_FOUND)
  }
  let participant
  const skip = pageNo === 1 ? 0 : ((pageNo - 1) * limit)
  if (currentUser.isAdmin) {
    participant = chatRoom.admins.find(admin => {
      return admin.participant.toString() === currentUser.id
    })
  } else {
    participant = chatRoom.user
  }
  if (participant) {
    const totalCount = await ChatRoomMessages.aggregate([
      {
        $match:
          { chatRoomId: mongoose.Types.ObjectId(chatRoomId) }
      }, {
        $project: {
          count:
            { $size: '$messages' }
        }
      }])

    const chatMsgs = await ChatRoomMessages.aggregate([
      { $match: { chatRoomId: mongoose.Types.ObjectId(chatRoomId) } },
      { $unwind: '$messages' },
      { $skip: skip },
      { $limit: limit },
      { $sort: { 'messages.sentAt': 1 } },
      {
        $project: {
          _id: '$messages._id',
          body: '$messages.body',
          sender: '$messages.sender',
          sentAt: '$messages.sentAt',
          attachment: '$messages.attachment'
        }
      }
    ])
    return { messages: chatMsgs, totalCount: totalCount }
  }
}
