const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  admins: [{
    _id: false,
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'admins'
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    nickNameForChat: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: new Date()
    },
    lastReadMsg: {
      type: mongoose.Schema.Types.ObjectId
    }
  }],
  roomType: { type: String },
  user: {
    _id: false,
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    nickNameForChat: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: new Date()
    },
    lastReadMsg: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'jobs'
  },
  lastMessage: {
    _id: mongoose.Schema.Types.ObjectId,
    sentAt: Date,
    sender: Object,
    body: String
  },
  createdAt: {
    type: Date,
    default: new Date()
  }
})

const ChatRoom = mongoose.model('chatRooms', schema)

module.exports.ChatRoom = ChatRoom
