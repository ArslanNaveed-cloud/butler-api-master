const mongoose = require('mongoose')
const { PENDING, ACCEPTED, IN_PROGRESS, SUBMITTED, APPROVED, CLOSED } = require('../../helpers/constants')

const Job = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  assignedBy: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  assignedTo: {
    name: {
      type: String
      // required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
      // required: true
    },
    email: {
      type: String
      // required: true
    }
  },
  client: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  description: {
    type: String,
    required: true
  },
  attachments: [
    { type: String }
  ],
  endDate: {
    type: Date,
    required: true
  },
  closedDate: {
    type: Date
  },
  price: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: [PENDING, ACCEPTED, IN_PROGRESS, SUBMITTED, APPROVED, CLOSED],
    required: true
  },
  category: {
    name: {
      type: String,
      required: true
    },
    path: {
      type: String
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categories',
      required: true
    }
  },
  clientRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'chatrooms',
    required: true
  },
  freelancerRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'chatrooms'
  },
  submittedOn: {
    type: Date
  },
  approvedOn: { type: Date }
}, {
  timestamps: true
})

module.exports = mongoose.model('jobs', Job)
