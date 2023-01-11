const mongoose = require('mongoose')

const Payment = mongoose.Schema({
  freelancer: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    name: String,
    email: String,
    phone: String,
    stringId: String
  },
  job: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'jobs',
      required: true
    },
    title: String,
    stringId: String
  },
  createdBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'admins',
      required: true
    },
    name: String,
    email: String,
    stringId: String
  },
  status: String,
  amount: Number,
  paymentDate: Date

}, {
  timestamps: true
})

module.exports = mongoose.model('payments', Payment)
