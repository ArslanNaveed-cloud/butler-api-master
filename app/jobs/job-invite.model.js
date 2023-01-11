const mongoose = require('mongoose')
const { ACCEPTED, PENDING, REJECTED } = require('../../helpers/constants')

const JobInvite = mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'jobs'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  status: {
    type: String,
    enum: [ACCEPTED, REJECTED, PENDING],
    required: true,
    default: PENDING

  }
}, {
  timestamps: true
})

module.exports = mongoose.model('job-invites', JobInvite)
