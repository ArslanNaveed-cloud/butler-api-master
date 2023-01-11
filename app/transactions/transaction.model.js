const mongoose = require('mongoose')

const Transaction = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
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
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'invoices',
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('transactions', Transaction)
